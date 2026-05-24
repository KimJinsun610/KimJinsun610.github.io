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
│   ├── CSkinnedAnimationObjectsShader  스키닝 (팀원 구현)
│   ├── ParticleShader                  파티클
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

## 기술 구현 상세

### DirectX 12 기반 게임 프레임워크 설계

DX12 저수준 API를 직접 다루는 게임 루프와 프레임워크를 설계·구현했습니다.

- `CGameFramework::FrameAdvance` — ProcessInput → AnimateObjects → Render → UI Draw → Present 순으로 고정
- `CScene` 추상 클래스로 씬별 BuildObjects / Render / AnimateObjects / ProcessInput 인터페이스 통일
- CBV/SRV Descriptor Heap을 `CScene` 내 static으로 공유해 씬 간 리소스 참조 일관성 확보
- Root Signature에 Constant Buffer, SRV, Sampler 슬롯을 용도별로 직접 정의

---

### Scene 단위 GPU 리소스 관리

씬 전환 시 GPU 리소스를 안전하게 해제하고 재생성하는 패턴을 직접 구현했습니다.

- `BuildObjects` — Upload Heap 적재 → `ExecuteCommandLists` → `WaitForGpuComplete` → `ReleaseUploadBuffers` 즉시 정리
- `ChangeScene` — `ReleaseObjects` 완전 해제 후 새 씬 `BuildObjects` 순서로 진행
- 모든 DX12 리소스에 Reference Count 기반 `AddRef / Release` 패턴 일관 적용

---

### AABB 충돌 처리

클라이언트에서 충돌을 연산하고 권위 서버가 최종 위치를 보정하는 구조입니다.

- `BoundingOrientedBox`의 orientation quaternion을 항등 값으로 고정해 AABB처럼 동작
- 대상 박스 코너 8개 → 각 면(삼각형 2개) 교차 검사 → 충돌 면의 법선 벡터 추출 → 이동 보정 방향 결정
- 서버가 `send_update_packet`으로 최종 위치 전송, 클라이언트는 수신한 위치로 즉시 덮어쓰기

---

### Direct2D + D3D11On12 UI 오버레이

DX12 파이프라인 위에 Direct2D UI를 올리기 위해 D3D11On12 인터롭 레이어를 직접 구성했습니다.

- `D3D11On12CreateDevice`로 D3D11 장치를 DX12 Command Queue에 연결
- SwapChain 백버퍼를 D2D RenderTarget으로 래핑 → 3D 렌더 완료 후 동일 백버퍼에 2D UI 오버레이
- DirectWrite 텍스트, WIC 이미지 로더, 버튼·텍스트 입력·프로그레스바 컴포넌트 직접 구현
- 씬별 독립 `CUI` 인스턴스로 타이틀 / 로비 / 인게임 UI 분리 관리

---

### MRT 기반 디퍼드 렌더링 + 섀도우 맵

**디퍼드 렌더링**

- MRT 4채널 (`Albedo`, `Normal`, `Material`, `Depth(R32F)`) 에 G-Buffer 기록
- `CTextureDeferdShader`가 Screen-space Quad에서 4채널을 합성해 최종 픽셀 색상 출력
- `PS_CB_DRAW_OPTIONS` 상수 버퍼로 그림자 ON/OFF 등 드로우 옵션을 픽셀 셰이더에 전달

**섀도우 맵**

- `CDepthRenderShader`가 광원 시점에서 씬 전체를 깊이 텍스처로 렌더링
- `TOLIGHTSPACES` 상수 버퍼 (광원 View·Projection 행렬) 를 합성 셰이더에 바인딩해 Shadow Lookup 수행
- 플레이어 / 적 / 보스 / 지형을 별도 Pass로 분리해 그림자 레이어 제어

---

### Frustum Culling

- 카메라 프러스텀 6개 평면을 매 프레임 갱신 (`Frustum::FinalUpdate`)
- 오브젝트 렌더 전 `CThirdPersonCamera::IsInFrustum(boundingBox)` 검사 → 프러스텀 밖이면 드로우콜 스킵
- 대형 맵에서 화면 밖 오브젝트의 불필요한 GPU 호출 제거

---

<div class="card-links" style="margin-top:40px;">
  <a class="btn btn-primary" href="/">← 목록으로</a>
</div>
