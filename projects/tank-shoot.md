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

외부 라이브러리 없이 `v / vt / vn / f` 데이터를 파싱하고, 로드 후 정점 좌표를 `[-1, 1]` 범위로 정규화하여 오브젝트 크기를 통일했습니다.

---

<a id="sec-2"></a>

## 2. VAO / VBO 구성

오브젝트별(탱크·맵·블록·아이템·탄환·HP바) `VAO`, `VBO_pos / VBO_normal / VBO_uv`를 각각 구성하고, `glVertexAttribPointer`로 셰이더 attribute와 연결했습니다.

---

<a id="sec-3"></a>

## 3. RecvThread 분리

`glutMainLoop()`는 단일 스레드에서 렌더링을 처리하기 때문에, 블로킹 `recv()`를 같은 스레드에서 호출하면 렌더링 루프가 멈춥니다. `RecvThread`를 별도 스레드로 생성하여 렌더링 지연을 막고, `CRITICAL_SECTION`으로 공유 데이터를 보호했습니다.

---

<a id="sec-4"></a>

## 4. Fine-Grained Locking

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

3종 아이템의 상태를 서버에서 관리하고, 획득 시 `SC_SET_ITEM` 패킷으로 전체 클라이언트에 브로드캐스트하여 아이템 정보를 동기화했습니다.

| 아이템 | 효과 |
|--------|------|
| HEAL | HP +20 회복 |
| SPEEDUP | 이동 속도 +0.1 영구 증가 |
| FREEZE | 다음 발사 탄환을 프리즈 탄환으로 변환 — 피격 시 상대 속도 -0.1 패널티 |

---

<a id="sec-6"></a>

## 6. 충돌 검증 패턴

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
