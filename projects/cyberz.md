---
layout: page
title: CyberZ
permalink: /projects/cyberz/
---

> DirectX 12 / IOCP 기반 3인 협동 멀티플레이 게임 | 졸업작품

<div class="card-links">
  <a class="btn" href="https://github.com/KimJinsun610/CyberZ" target="_blank">GitHub</a>
  <a class="btn" href="https://www.youtube.com/watch?v=1F4cTjuyq-g" target="_blank">YouTube</a>
  <a class="btn" href="https://www.notion.so/CyberZ-369eaebf4a0d803cb713d0058532b93d" target="_blank">개발 일지 (Notion)</a>
</div>

---

## 개요

| 항목 | 내용 |
|------|------|
| 개발 언어 | C++, HLSL |
| 개발 환경 | Visual Studio 2022, DirectX 12, Direct2D, IOCP |
| 개발 인원 | 3명 (클라이언트 2, 서버 1) |
| 개발 기간 | 2024.01 ~ 2024.07 (7개월) |
| 담당 역할 | 클라이언트 |

---

## 클라이언트 프레임워크 구조

```
GameFramework  ── 메인 루프 / DX12 초기화
│
├── Scene (추상 클래스)
│   ├── CStartScene           타이틀 / 로그인
│   ├── CPrepareRoomScene     캐릭터 선택 로비
│   ├── CLoadingScene         씬 전환 로딩
│   ├── CFirstRoundScene      Stage 1
│   └── CSecondRoundScene     Stage 2 (Boss)
│
├── Shader Pipeline
│   ├── CDepthRenderShader              Shadow Map
│   ├── CStandardShader                 지형 / 정적 오브젝트
│   ├── CSkinnedAnimationObjectsShader  스키닝
│   └── CTextureDeferdShader            MRT 합성 / Post-Process
│
├── CUI ── Direct2D + D3D11On12 오버레이
│          Button · TextInput · ProgressBar · WIC Image
│
└── Network ── TCP Winsock
```

---

## 담당 구현 항목

- DirectX 12 기반 게임 프레임워크 설계 (Scene / Camera / Shader / UI)
- Scene 단위 GPU 리소스 관리 — Upload Heap → Default Heap 전송 후 즉시 해제
- AABB 충돌 처리 — 서버 위치 보정 + 클라이언트 충돌 연산 분리
- Direct2D + D3D11On12 기반 2D UI 오버레이 시스템
- MRT 기반 디퍼드 렌더링 + 섀도우 맵 (광원 시점 깊이 버퍼 기반)
- Frustum Culling — 카메라 프러스텀 기반 오브젝트 컬링

---

## 구현 상세

<div class="detail-toc">
  <a href="#sec-1">1. 게임 프레임워크 설계</a>
  <span class="toc-sep">*</span>
  <a href="#sec-2">2. GPU 리소스 관리</a>
  <span class="toc-sep">*</span>
  <a href="#sec-3">3. Direct2D UI 오버레이</a>
  <span class="toc-sep">*</span>
  <a href="#sec-4">4. 디퍼드 렌더링 + 섀도우 맵</a>
  <span class="toc-sep">*</span>
  <a href="#sec-5">5. Frustum Culling</a>
  <span class="toc-sep">*</span>
  <a href="#sec-6">6. 멀티플레이 인터랙션 동기화</a>
  <span class="toc-sep">*</span>
  <a href="#sec-7">7. AABB 충돌 처리</a>
</div>


<a id="sec-1"></a>

## 1. DirectX 12 기반 게임 프레임워크 설계

### 설계 목표

엔진 없이 DX12 저수준 API만으로 게임 루프와 렌더링 파이프라인을 처음부터 구현하였습니다. Command List 제출, Descriptor Heap 관리, Root Signature 정의 등 DX12가 요구하는 모든 설정을 직접 다루면서, 엔진이 추상화해주는 계층 아래에서 어떤 일이 일어나는지 직접 설계하는 것이 목표였습니다. 씬 단위 인터페이스 통일과 셰이더 파이프라인 분리를 통해 기능 추가와 씬 전환이 용이한 구조를 갖추었습니다.

### 설계 포인트

- **CGameFramework::FrameAdvance** — ProcessInput → AnimateObjects → Render → UI Draw → Present 순으로 고정
- **CScene** 추상 클래스로 씬별 BuildObjects / Render / AnimateObjects / ProcessInput 인터페이스 통일
- CBV/SRV Descriptor Heap을 **CScene** 내 static으로 공유해 씬 간 리소스 참조 일관성 확보
- Root Signature에 Constant Buffer, SRV, Sampler 슬롯을 용도별로 직접 정의
- BuildObject - ExecuteCommandLists → WaitForGpuComplete → ReleaseUploadBuffers 순서로 GPU 전송 완료 후 UploadHeap 즉시 해제

---

<a id="sec-2"></a>

## 2. Scene 단위 GPU 리소스 관리

### 설계 목표

DX12는 GPU 동기화를 직접 관리해야 하기 때문에, 리소스 해제 시점을 잘못 잡으면 GPU가 아직 사용 중인 메모리를 CPU가 해제하는 문제가 발생합니다. 씬 전환 시 Upload Heap을 즉시 해제하고, 씬 간 리소스 충돌 없이 재생성할 수 있는 명확한 생명주기 패턴을 직접 설계하였습니다.

캐릭터 선택 씬(**CPrepareRoomScene**)에서는 별도의 리소스 관리 문제가 발생하여 선행 로딩 구조를 추가로 적용하였습니다.

### 설계 포인트

- BuildObjects — Upload Heap 적재 → ExecuteCommandLists → WaitForGpuComplete → ReleaseUploadBuffers 즉시 정리
- **ChangeScene** — **ReleaseObjects** 완전 해제 후 새 씬 **BuildObjects** 순서로 진행
- 모든 DX12 리소스에 Reference Count 기반 **AddRef / Release** 패턴 일관 적용
- 캐릭터 선택 씬 진입 시 모든 캐릭터를 미리 생성, 선택 시 렌더링 활성화 상태만 전환

<div class="ts-box" markdown="1">

#### Trouble Shooting

**증상** : 캐릭터 선택 화면에서 반복적으로 캐릭터를 변경할수록 메모리 사용량이 지속 증가하고 프레임 드롭이 발생했습니다.

**원인** : 캐릭터 변경 시마다 모델을 동적 생성·해제하는 구조로 구현했는데, CyberZ의 캐릭터 모델은 자체 바이너리 포맷으로 메시·스켈레톤·애니메이션 데이터를 하나의 파일에 포함하고 있어 생성 비용 자체가 컸습니다. 반복 생성·해제 과정에서 일부 그래픽 리소스가 완전히 반환되지 않는 현상이 겹치면서 메모리 누수와 반응 속도 저하가 함께 발생했습니다.

멀티플레이 환경 특성상 플레이어 3명이 독립적으로 캐릭터를 선택하며, 동시에 같은 캐릭터를 고를 수 있어 슬롯별 프리뷰가 필요했습니다. 이 구조에서 매번 모델을 생성·해제하는 방식은 근본적인 문제라고 판단했습니다.

**해결** : 씬 진입 시 더미 포함 4종 캐릭터를 3개 슬롯분 총 12개 미리 생성하고, 선택 시에는 렌더링 활성화 상태만 변경하도록 구조를 변경하였습니다. 캐릭터 수가 적은 프로젝트 규모에서는 추가 메모리 부담이 크지 않다고 판단하였으며, 반복적인 생성·해제 과정을 완전히 제거하여 메모리 증가와 선택 반응 속도 문제를 함께 해결하였습니다.

<img class="detail-img" src="{{ '/assets/img/character.gif' | relative_url }}" alt="캐릭터 선택 시연">

</div>

---

<a id="sec-3"></a>

## 3. Direct2D + D3D11On12 UI 오버레이

### 설계 목표

DX12는 Direct2D와 직접 호환되지 않기 때문에, UI를 별도 렌더 타겟이나 외부 라이브러리 없이 구현하려면 D3D11On12 인터롭 레이어를 직접 구성해야 합니다. 게임에 필요한 버튼·텍스트 입력·프로그레스바 등 커스텀 UI 컴포넌트를 직접 제어하기 위해 이 방식을 선택하였으며, DX12 파이프라인과 동일한 백버퍼 위에 2D UI를 오버레이하여 별도의 렌더 타겟 없이 통합된 렌더링 흐름을 유지하였습니다.

### 설계 포인트

- **D3D11On12CreateDevice**로 D3D11 장치를 DX12 Command Queue에 연결
- SwapChain 백버퍼를 D2D RenderTarget으로 래핑 → 3D 렌더 완료 후 동일 백버퍼에 2D UI 오버레이
- DirectWrite 텍스트, WIC 이미지 로더, 버튼·텍스트 입력·프로그레스바 컴포넌트 직접 구현
- 씬별 독립 **CUI** 인스턴스로 타이틀 / 로비 / 인게임 UI 분리 관리

<img class="detail-img" src="{{ '/assets/img/UI.gif' | relative_url }}" alt="Direct2D UI 오버레이 시연">

---

<a id="sec-4"></a>

## 4. MRT 기반 디퍼드 렌더링 + 섀도우 맵

### 설계 목표

게임 내 다수의 동적 광원과 실시간 그림자 표현이 필요했습니다. Forward Rendering에서는 광원마다 씬 전체를 다시 렌더링해야 하므로 광원 수가 늘어날수록 비용이 선형적으로 증가합니다. 이를 해결하기 위해 G-Buffer에 재질 정보를 한 번에 기록한 뒤 단일 합성 패스에서 모든 광원을 처리하는 Deferred Rendering을 채택하였습니다. 그림자는 광원 시점의 별도 Depth Pass를 추가하여 합성 단계에서 Shadow Lookup으로 처리하였습니다.

### 설계 포인트

**디퍼드 렌더링**

- MRT 4채널 (**Albedo**, **Normal**, **Material**, **Depth(R32F)**) 에 G-Buffer 기록
- **CTextureDeferdShader**가 Screen-space Quad에서 4채널을 합성해 최종 픽셀 색상 출력
- **PS_CB_DRAW_OPTIONS** 상수 버퍼로 그림자 ON/OFF 등 드로우 옵션을 픽셀 셰이더에 전달

**섀도우 맵**

- **CDepthRenderShader**가 광원 시점에서 씬 전체를 깊이 텍스처로 렌더링
- **TOLIGHTSPACES** 상수 버퍼 (광원 View·Projection 행렬) 를 합성 셰이더에 바인딩해 Shadow Lookup 수행
- 플레이어 / 적 / 보스 / 지형을 별도 Pass로 분리해 그림자 레이어 제어

<div style="display:flex; gap:8px; margin:16px 0;">
  <div style="flex:1; text-align:center;">
    <img class="detail-img" src="{{ '/assets/img/Albedo.png' | relative_url }}" alt="Albedo Pass">
    <p style="font-size:0.85em; color:#888; margin-top:4px;">Albedo Pass — 조명 없는 텍스처 원색</p>
  </div>
  <div style="flex:1; text-align:center;">
    <img class="detail-img" src="{{ '/assets/img/Shadow.png' | relative_url }}" alt="Final Composite">
    <p style="font-size:0.85em; color:#888; margin-top:4px;">Final Composite — 디퍼드 합성 + 섀도우</p>
  </div>
</div>

---

<a id="sec-5"></a>

## 5. Frustum Culling

### 설계 목표

Stage 2는 대형 실내 맵으로 구성되어 있어 카메라 시야 밖에 배치된 오브젝트에도 매 프레임 드로우콜이 발생하고 있었습니다. DX12에서는 렌더 여부 판단을 직접 구현해야 하므로, 카메라 프러스텀 6개 평면과 오브젝트 AABB의 교차 여부를 검사해 시야 밖 오브젝트의 GPU 호출을 차단하는 컬링 로직을 직접 구현하였습니다.

### 설계 포인트

- 카메라 프러스텀 6개 평면을 매 프레임 갱신 (**Frustum::FinalUpdate**)
- 오브젝트 렌더 전 **CThirdPersonCamera::IsInFrustum(boundingBox)** 검사 → 프러스텀 밖이면 드로우콜 스킵
- 대형 맵에서 화면 밖 오브젝트의 불필요한 GPU 호출 제거

---

<a id="sec-6"></a>

## 6. 멀티플레이 씬 인터랙션 동기화

### 설계 목표

Stage 2 미션은 두 플레이어가 동시에 인터랙션해야 게이지가 오르는 협동 구조입니다. 각 클라이언트가 독립적으로 동작하는 환경에서 타 플레이어의 행동 상태를 정확하게 반영하기 위해, 인터랙션 이벤트를 서버 경유로 브로드캐스트하는 구조로 설계하였습니다.

### 설계 포인트

- 플레이어 인터랙션 발생 시 서버에 패킷 전송 → 서버가 전체 클라이언트에 브로드캐스트
- 클라이언트는 수신 패킷 기반으로 타 플레이어 상태 갱신 (**ProcessPacket**)
- 미션 게이지 증가 조건을 동시 활성화 오브젝트 수(**check > 1**)로 판단

<div class="ts-box" markdown="1">

#### Trouble Shooting

**증상** : Stage 2 동시 인터랙션 미션에서 타 플레이어의 동작이 게이지에 반영되지 않는 문제가 발생했습니다.

---

**원인 1 — 서버에서 잘못된 플레이어 ID 전송**

**SC_PLAYER_ALIVE** 패킷의 id 필드에 서버 내부 연결 ID(**c_id**)를 그대로 담아 전송했습니다. 클라이언트는 이 값을 플레이어 게임 ID로 해석해 처리하는데, 두 값이 일치하지 않아 엉뚱한 플레이어 슬롯이 업데이트되고 있었습니다.

```cpp
// 수정 전
alivePacket.id = c_id;
// 수정 후
alivePacket.id = p->id;
```

**원인 2 — 포인터 오전달로 쓰레기 값 전송**

**do_send** 호출 시 패킷 구조체가 아닌 **char\*** 포인터 변수 자체의 주소(**&p**)를 전달하고 있었습니다. 실제 패킷 데이터 대신 포인터 변수의 주소가 전송되어 클라이언트가 의미 없는 값을 수신하고 있었습니다.

```cpp
// 수정 전
clients[id].do_send(&p);
// 수정 후
clients[id].do_send(&comst);
```

**원인 3 — 클라이언트 플레이어 배열 인덱스 오류**

**ProcessPacket**에서 타 플레이어 상태 적용 시 서버 연결 ID(**id**)로 플레이어 배열에 접근하고 있었습니다. 플레이어 배열은 캐릭터 타입(**type**) 기반으로 구성되어 있어 잘못된 슬롯에 상태가 적용되고 있었습니다.

```cpp
// 수정 전
m_ppPlayer[id]->SetCrawl(false);
// 수정 후
m_ppPlayer[type]->SetCrawl(false);
```

---

**해결** : 서버 개발자, 팀원과 패킷 흐름을 단계별로 추적하여 세 가지 원인을 특정하고 수정하였습니다.

<img class="detail-img" src="{{ '/assets/img/mission2.png' | relative_url }}" alt="Stage 2 동시 인터랙션 미션"> 이 과정을 통해 패킷 필드 정의와 인덱스 체계를 팀 전체가 동일하게 이해하고 있는 것이 멀티플레이 동기화에서 얼마나 중요한지 체감하였습니다.

</div>

---

<a id="sec-7"></a>

## 7. AABB 충돌 처리

### 설계 목표

멀티플레이 환경에서 충돌 처리를 서버에만 위임하면 네트워크 지연으로 인해 클라이언트 측에서 벽을 통과하는 것처럼 보이는 문제가 생깁니다. 반대로 클라이언트에만 맡기면 위치 조작에 취약해집니다. 이를 절충하기 위해 클라이언트가 먼저 충돌을 연산해 즉각적인 반응성을 확보하고, 서버가 최종 위치를 전송해 동기화를 보정하는 구조를 적용하였습니다.

### 설계 포인트

- **BoundingOrientedBox**의 orientation quaternion을 항등 값으로 고정해 AABB처럼 동작
- 대상 박스 코너 8개 → 각 면(삼각형 2개) 교차 검사 → 충돌 면의 법선 벡터 추출 → 이동 보정 방향 결정
- 서버가 **send_update_packet**으로 최종 위치 전송, 클라이언트는 수신한 위치로 즉시 덮어쓰기

---

<div class="card-links" style="margin-top: 40px;">
  <a class="btn btn-primary" href="/">← 목록으로</a>
</div>

<nav class="floating-toc" id="floatingToc">
  <p class="ftoc-title">구현 상세</p>
  <ol>
    <li><a href="#sec-1">게임 프레임워크 설계</a></li>
    <li><a href="#sec-2">GPU 리소스 관리</a></li>
    <li><a href="#sec-3">Direct2D UI 오버레이</a></li>
    <li><a href="#sec-4">디퍼드 렌더링 + 섀도우 맵</a></li>
    <li><a href="#sec-5">Frustum Culling</a></li>
    <li><a href="#sec-6">멀티플레이 인터랙션 동기화</a></li>
    <li><a href="#sec-7">AABB 충돌 처리</a></li>
  </ol>
</nav>

<a class="scroll-up-left" id="scrollUpLeft" href="#" aria-label="맨 위로 이동">↑</a>

<script>
  (function () {
    var btn = document.getElementById('scrollUpLeft');
    var toc = document.getElementById('floatingToc');
    var tocLinks = Array.from(toc.querySelectorAll('a'));
    var sections = [1,2,3,4,5,6,7].map(function(n) {
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
