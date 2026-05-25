---
layout: page
title: Tank Shoot
permalink: /projects/tank-shoot/
---

> OpenGL / TCP 기반 네트워크 2인 대전 게임 | 팀 프로젝트

<div class="card-links">
  <a class="btn" href="https://github.com/KimJinsun610/NetworkGPTerm" target="_blank">GitHub</a>
</div>

---

## 개요

| 항목 | 내용 |
|------|------|
| 개발 언어 | C, C++ |
| 개발 환경 | Visual Studio 2022, OpenGL, TCP, GitHub |
| 개발 인원 | 3명 |
| 개발 기간 | 2023.11 ~ 2023.12 (2개월) |
| 담당 역할 | 클라이언트 + 서버 공동 개발 |

---

## 담당 구현 항목

**클라이언트**
- OBJ 파서 구현, 맵 구성, 플레이어 이동·공격, 카메라 무빙, 아이템 시스템

**서버**
- 아이템 세팅 및 상호작용 처리
- 충돌 처리 연산 및 충돌 정보 처리

---

## 클라이언트 구조

```
TankShoot_Client
├── main.cpp      ← GLUT 루프, 렌더링·입력 콜백, RecvThread
├── tank.cpp      ← 마우스 모션 처리 (카메라 yaw/pitch)
├── NetworkMgr    ← TCP 소켓 연결 및 패킷 송신 (SendPacket)
├── objReader     ← OBJ 파서 (v/vt/vn/f 파싱 + [-1, 1] 정규화)
├── protocol.h    ← CS / SC 패킷 구조체 정의
└── std.h         ← OpenGL / GLEW / GLM / 표준 공통 헤더
```

---

## 서버 구조

```
Main Thread       ← 로그인/레디, Recv + 패킷 처리
ClientThread 1/2  ← 입력 처리 (클라이언트별 독립)
do_send Thread    ← 33Hz 상태 브로드캐스트
```

- 입력 처리(`ClientThread`)와 상태 동기화(`do_send`)를 **분리**하여 입력 지연 최소화
- 스레드: 3종 (Main, ClientThread × 2, do_send)
- 패킷: CS 9개 + SC 15개 = **총 24개**

---

## 구현 상세

<div class="detail-toc">
  <a href="#sec-1">1. OBJ 파서 구현</a>
  <span class="toc-sep">*</span>
  <a href="#sec-2">2. VAO / VBO 구성</a>
  <span class="toc-sep">*</span>
  <a href="#sec-3">3. RecvThread 분리</a>
  <span class="toc-sep">*</span>
  <a href="#sec-4">4. Fine-Grained Locking</a>
  <span class="toc-sep">*</span>
  <a href="#sec-5">5. 아이템 시스템 서버 동기화</a>
  <span class="toc-sep">*</span>
  <a href="#sec-6">6. 충돌 검증 패턴</a>
</div>


<a id="sec-1"></a>

## 1. OBJ 파서 구현

### 설계 목표

외부 라이브러리 없이 OBJ 형식을 직접 파싱하는 것이 목표였습니다. 탱크·맵·아이템 등 오브젝트마다 원본 모델의 크기가 제각각이어서, 로드 후 좌표를 정규화하는 처리 없이는 씬 내 오브젝트 간 스케일이 일관되지 않는 문제가 생겼습니다. 파싱과 정규화를 한 단계에서 처리하여 이후 렌더링 코드가 크기를 별도로 보정하지 않아도 되도록 설계하였습니다.

### 설계 포인트

- `v / vt / vn / f` 데이터를 순차 파싱 후 인덱스로 재조합하여 렌더링용 배열 구성
- 파싱 중 각 축의 min / max를 추적, 로드 완료 후 min-max 정규화로 `[-1, 1]` 범위 매핑 — 모델 크기 통일
- 정점 좌표를 원점 중심으로 이동(centering)하여 모델 변환 기준점 일관성 확보

```cpp
// 정규화 — 파싱 완료 후 각 정점에 적용
temp.x = temp.x - minX;
temp.x = ((temp.x * 2.0f) / scaleX) - 1.0f;  // [-1, 1] 매핑
```

---

<a id="sec-2"></a>

## 2. VAO / VBO 구성

### 설계 목표

탱크 몸통·포탑, 맵, 블록, 탄환, 아이템, HP바 등 렌더링 대상이 각각 독립적인 드로우콜과 모델 변환 행렬을 가져야 했습니다. 오브젝트별로 독립된 VAO를 두어 드로우콜 전환 시 OpenGL 상태를 최소한으로 교체하고, 정점·법선·UV 데이터를 분리된 VBO로 관리하여 셰이더 attribute와의 연결을 명확하게 구성하였습니다.

### 설계 포인트

- 오브젝트별 독립 VAO로 드로우콜 전환 시 상태 재설정 비용 최소화
- 위치(`VBO_pos`) · 법선(`VBO_normal`) · UV(`VBO_uv`)를 분리된 VBO로 관리하여 데이터 레이아웃 명확화
- `glVertexAttribPointer`로 각 VBO를 셰이더 attribute location에 바인딩 (0: 위치, 1: 법선, 2: UV)

```cpp
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(float) * 3, 0); // 위치
glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), 0); // 법선
glVertexAttribPointer(2, 2, GL_FLOAT, GL_FALSE, 2 * sizeof(float), 0); // UV
```

---

<a id="sec-3"></a>

## 3. RecvThread 분리

### 설계 목표

`glutMainLoop()`는 단일 스레드에서 렌더링을 처리합니다. 같은 스레드에서 블로킹 `recv()`를 호출하면 패킷이 도착할 때까지 렌더링 루프 전체가 멈추어 화면이 멈추는 문제가 발생합니다. 수신 로직을 별도 스레드로 분리하여 렌더링과 네트워크 수신이 독립적으로 동작하도록 설계하였습니다.

### 설계 포인트

- `RecvThread`를 별도 스레드로 생성하여 렌더링 루프와 네트워크 수신 완전 분리
- 길이 헤더(`sizeof(int)`) 먼저 수신 후 페이로드를 `MSG_WAITALL`로 수신하는 2단계 방식으로 패킷 경계 보장
- 수신 스레드와 렌더링 스레드가 공유하는 플레이어 상태 배열을 `CRITICAL_SECTION`으로 보호하여 경합 방지

---

<a id="sec-4"></a>

## 4. Fine-Grained Locking

### 설계 목표

서버에서 플레이어 상태 배열은 전역으로 관리되며, `ClientThread(×2)`와 `do_send` 스레드가 동시에 접근합니다. 배열 전체를 단일 락으로 감싸면 서로 무관한 연산(로그인과 공격 등)도 서로를 대기하게 되어 불필요한 직렬화가 발생합니다. 연산 유형별로 락을 분리하여 다른 플레이어의 처리 중에도 패킷 처리가 가능하도록 설계하였습니다.

### 설계 포인트

- `std::lock_guard`(RAII 패턴)로 예외 발생 시에도 락 자동 해제 — 데드락 방지
- `do_send`는 상태 읽기 시 락 없이 진행, 전송 시에만 `g_Sendmutex` 획득 — 읽기 경합 최소화
- 로그인·이동 등 진입 빈도가 높은 경로에는 `CRITICAL_SECTION` 사용 — Windows 환경에서 `mutex` 대비 낮은 오버헤드

플레이어 배열이 전역으로 관리되어 2개의 스레드에서 동시 접근 → 락을 세분화하여 동시성 최적화

| 상황 | 락 전략 |
|------|---------|
| 로그인 | `g_Recvmutex_login` 사용 |
| 이동 | Critical Section으로 보호 |
| 공격 | 탄환 배열 + 브로드캐스트 보호, `lock_guard`로 데드락 방지 |
| 아이템 | 아이템별 짧은 락 획득 후 즉시 해제 |
| do_send | 읽기는 락 없이, 전송 시에만 `g_Sendmutex` 획득 |

다른 플레이어가 행동 중에도 패킷 처리가 가능하도록 구현

---

<a id="sec-5"></a>

## 5. 아이템 시스템 서버 동기화

### 설계 목표

아이템 획득 처리를 클라이언트에서만 수행하면, 두 클라이언트가 동시에 같은 아이템에 도달했을 때 각자가 독립적으로 효과를 적용하는 중복 획득 문제가 발생합니다. 클라이언트는 충돌 감지만 담당하고, 실제 아이템 효과 적용과 상태 반영은 서버에서 단일 경로로 처리하도록 설계하였습니다.

### 설계 포인트

- 아이템 충돌 감지는 클라이언트(AABB) → `CS_ITEM` 패킷으로 서버에 보고
- 서버에서 효과 적용(HP 증가 / 속도 증가 / 동결 플래그 설정) 후 `SC_SET_ITEM`으로 전체 클라이언트에 브로드캐스트 — 양측 동기화
- 동결(FREEZE) 아이템: 서버에서 다음 탄환에 freeze 플래그 설정 → 피격 시 `CS_HIT.freeze_bullet=true` → 서버에서 피격 플레이어 속도 -0.1 패널티 부여

3종 아이템의 상태를 서버에서 관리하고, 획득 시 `SC_SET_ITEM` 패킷으로 전체 클라이언트에 브로드캐스트하여 아이템 정보를 동기화했습니다.

| 아이템 | 효과 |
|--------|------|
| HEAL | HP +20 회복 |
| SPEEDUP | 이동 속도 +0.1 영구 증가 |
| FREEZE | 다음 발사 탄환을 프리즈 탄환으로 변환 — 피격 시 상대 속도 -0.1 패널티 |

---

<a id="sec-6"></a>

## 6. 충돌 검증 패턴

### 설계 목표

클라이언트에서만 충돌을 처리하면 위치 조작에 취약해지고, 서버에서만 처리하면 네트워크 지연만큼 반응이 늦어집니다. 이동 충돌(서버 권위)과 탄환 충돌(클라이언트 감지 후 서버 보고)을 역할에 따라 분리하여 반응성과 신뢰성을 동시에 확보하도록 설계하였습니다.

### 설계 포인트

- **이동 충돌** : 서버에서 위치 갱신 → AABB 검사 → 충돌 시 이동량 롤백 → `SC_UPDATE`로 보정 위치 전달 (Authoritative Server)
- **탄환 충돌** : 클라이언트에서 AABB 감지 → `CS_HIT` 보고 → 서버에서 HP 처리 후 전체 브로드캐스트
- 탱크 간 충돌 / 벽 충돌은 서버에서 `tank_collid()` / `wall_collid()` 함수로 일괄 처리 — 클라이언트 위치 조작 불가

```
CS_MOVE_PACKET { direction, bodyYaw }  →  Server: 충돌 계산 후 이동 처리
                                        →  SC_UPDATE_PACKET  →  전체 클라이언트
```

서버에서 충돌 연산을 수행하고 결과를 브로드캐스트하는 **권위 서버(Authoritative Server)** 방식

---

<div class="card-links" style="margin-top: 40px;">
  <a class="btn btn-primary" href="/">← 목록으로</a>
</div>

<nav class="floating-toc" id="floatingToc">
  <p class="ftoc-title">구현 상세</p>
  <ol>
    <li><a href="#sec-1">OBJ 파서 구현</a></li>
    <li><a href="#sec-2">VAO / VBO 구성</a></li>
    <li><a href="#sec-3">RecvThread 분리</a></li>
    <li><a href="#sec-4">Fine-Grained Locking</a></li>
    <li><a href="#sec-5">아이템 시스템 서버 동기화</a></li>
    <li><a href="#sec-6">충돌 검증 패턴</a></li>
  </ol>
</nav>

<a class="scroll-up-left" id="scrollUpLeft" href="#" aria-label="맨 위로 이동">↑</a>

<script>
  (function () {
    var btn = document.getElementById('scrollUpLeft');
    var toc = document.getElementById('floatingToc');
    var tocLinks = Array.from(toc.querySelectorAll('a'));
    var sections = [1,2,3,4,5,6].map(function(n) {
      return document.getElementById('sec-' + n);
    }).filter(Boolean);
    var trigger = document.querySelector('.detail-toc');

    function onScroll() {
      var y = window.scrollY;

      btn.classList.toggle('visible', y > 300);

      if (trigger) {
        toc.classList.toggle('visible', trigger.getBoundingClientRect().bottom < 0);
      }

      var current = -1;
      sections.forEach(function(sec, i) {
        if (sec.getBoundingClientRect().top <= 100) current = i;
      });
      tocLinks.forEach(function(link, i) {
        link.classList.toggle('ftoc-active', i === current);
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();
</script>
