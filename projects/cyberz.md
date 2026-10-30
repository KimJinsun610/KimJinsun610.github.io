---
layout: page
title: CyberZ
permalink: /projects/cyberz/
---

<div class="case-detail">
<div class="instruction-summary tag-row" role="list" aria-label="주요 구현 기술">
  <span class="tag" role="listitem">DirectX 12</span>
  <span class="tag" role="listitem">GPU 리소스 생명주기</span>
  <span class="tag" role="listitem">멀티플레이 상태 동기화</span>
  <span class="tag" role="listitem">MRT 디퍼드 렌더링</span>
  <span class="tag" role="listitem">섀도우 맵 · PCF</span>
  <span class="tag" role="listitem">HLSL</span>
  <span class="tag" role="listitem">D3D11On12 · Direct2D</span>
</div>
<div class="card-links">
  <a class="btn" href="https://github.com/KimJinsun610/CyberZ" target="_blank" rel="noopener noreferrer">GitHub</a>
  <a class="btn" href="https://www.youtube.com/watch?v=1F4cTjuyq-g" target="_blank" rel="noopener noreferrer">게임플레이 영상</a>
  <a class="btn" href="https://www.notion.so/CyberZ-369eaebf4a0d803cb713d0058532b93d" target="_blank" rel="noopener noreferrer">개발 일지(Notion)</a>
  <a class="btn" href="#role">담당 범위</a>
</div>
</div>

엔진 없이 **DirectX 12**로 만든 3인 협동 멀티플레이 게임(졸업작품)입니다. 서버는 IOCP 기반이며, 저는 클라이언트에서 게임 프레임워크 · 렌더링 파이프라인 · 2D UI · 캐릭터 선택 · 충돌 처리 · 협동 미션 동기화를 맡았습니다.

| 항목 | 내용 |
|---|---|
| 기간 · 인원 | 2024.01 ~ 2024.07 (7개월) · 3명 (클라이언트 2, 서버 1) |
| 담당 | 클라이언트 — DX12 프레임워크 · 렌더링(MRT · 섀도우 맵) · Direct2D UI · 캐릭터 선택 · 충돌 처리 · 협동 미션 동기화 |
| 환경 | C++ · HLSL · DirectX 12 · Direct2D / DirectWrite · Visual Studio 2022 |

## 주요 구현과 문제 해결

<nav class="detail-toc" aria-label="CyberZ 기술 사례">
  <a href="#framework">01 게임 프레임워크</a>
  <span class="toc-sep">/</span>
  <a href="#character-preload">02 캐릭터 선택 리소스</a>
  <span class="toc-sep">/</span>
  <a href="#mission-sync">03 협동 미션 동기화</a>
  <span class="toc-sep">/</span>
  <a href="#rendering">04 MRT 렌더링 · 섀도우 맵</a>
  <span class="toc-sep">/</span>
  <a href="#supporting-work">보조 구현</a>
  <span class="toc-sep">/</span>
  <a href="#role">담당 범위</a>
</nav>

<a id="framework"></a>

## 01. DirectX 12 게임 프레임워크 설계

**게임 루프 · 씬 인터페이스 · GPU 리소스 생명주기**

<div class="experience-summary" markdown="1">

**목표** · 엔진 없이 DX12 API만으로 게임 루프와 렌더링 흐름을 만들고, 씬을 추가하거나 바꿔도 같은 틀 안에서 동작하게 하는 것.

**구현** · 프레임 순서를 한 곳에 고정하고, 씬은 공통 인터페이스로 통일하고, GPU 리소스는 「올리기 → 전송 대기 → 업로드 버퍼 해제」 순서로 관리했습니다.

</div>

### 왜 직접 만들어야 했나

엔진은 명령 목록 제출, 디스크립터 힙, 루트 시그니처, GPU 동기화를 감춰 줍니다. DX12에서는 이것을 모두 코드로 정해야 하고, 특히 **GPU가 아직 쓰는 리소스를 CPU가 먼저 해제하지 않도록** 해제 시점을 직접 관리해야 합니다. 씬이 다섯 개(타이틀 · 캐릭터 선택 · 로딩 · Stage 1 · Stage 2)라, 씬마다 이 처리를 따로 짜면 전환 때마다 같은 실수가 반복될 수 있었습니다.

### 구조

```text
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
│   ├── CDepthRenderShader              광원 시점 깊이 패스 (섀도우 맵)
│   ├── CStandardShader                 지형 / 정적 오브젝트
│   ├── CSkinnedAnimationObjectsShader  스키닝
│   └── CTextureDeferdShader            MRT 합성
│
├── CUI ── Direct2D + D3D11On12 오버레이
│          Button · TextInput · ProgressBar · WIC Image
│
└── Network ── TCP Winsock
```

### 구현 내용

- **프레임 순서 고정** — `FrameAdvance`가 매 프레임 입력 처리 → 오브젝트 갱신 → 광원 시점 깊이 패스 → MRT 지오메트리 패스 → 합성 패스 → 2D UI → Present 순서로 진행합니다. 새 기능은 이 순서의 어느 단계에 들어가는지만 정하면 됩니다.
- **씬 인터페이스 통일** — 모든 씬이 `CScene`을 상속해 `BuildObjects` · `AnimateObjects` · `Render` · `ProcessInput` · `ReleaseObjects`를 구현합니다. 프레임워크는 지금 씬이 무엇인지 몰라도 같은 함수만 부릅니다.
- **디스크립터 힙 공유** — CBV/SRV 디스크립터 힙을 `CScene`의 static 멤버로 두어, 씬이 바뀌어도 텍스처 · 상수 버퍼를 같은 방식으로 참조합니다. 루트 시그니처에는 상수 버퍼 · 텍스처 · 샘플러 슬롯을 용도별로 정의했습니다.
- **씬 전환과 리소스 생명주기** — `ChangeScene`은 이전 씬을 완전히 해제(`ReleaseObjects`)한 뒤 새 씬을 만듭니다. 새 리소스는 업로드 힙에 올려 명령을 실행하고, `WaitForGpuComplete`로 GPU 전송이 끝나기를 기다린 다음 업로드 버퍼를 해제합니다(`ReleaseUploadBuffers`). DX12 리소스는 참조 카운트(`AddRef` / `Release`)로 일관되게 관리했습니다.

```cpp
// 씬 전환: 이전 씬 해제 → 새 씬 생성 → GPU 전송 완료 대기 → 업로드 버퍼 해제
ReleaseObjects();
m_pScene->BuildObjects(m_pd3dDevice, m_pd3dCommandList, myPlayerNum);
m_pd3dCommandList->Close();
m_pd3dCommandQueue->ExecuteCommandLists(1, ppd3dCommandLists);
WaitForGpuComplete();
if (m_pScene) m_pScene->ReleaseUploadBuffers();
```

### 결과와 한계

다섯 개의 씬이 같은 틀로 만들어지고 바뀌며, 씬 전환 때 GPU가 쓰는 메모리를 먼저 해제하는 문제 없이 동작합니다. 아래 사례들(캐릭터 선택, 협동 미션, MRT 렌더링)도 모두 이 프레임 순서와 리소스 규칙 위에 얹었습니다.

셰이더 하나가 파이프라인 상태(PSO)를 하나만 갖는 구조라, **한 오브젝트를 패스마다 다른 셰이더로 그리는 경우**(예: 그림자용 깊이 패스)를 처음에는 고려하지 못했습니다. 이 한계는 아래 04번 그림자 문제의 원인 중 하나가 되었습니다.

**구현 코드:** [GameFramework.cpp — 프레임 루프 · 씬 전환][src-framework] · [Scene.h — 씬 인터페이스][src-scene-h]

<a id="character-preload"></a>

## 02. 캐릭터 선택 화면의 반복 생성 · 해제 제거

**모델 로딩 비용 · GPU 리소스 생명주기 · 미리 생성 후 표시 전환**

<div class="experience-summary" markdown="1">

**문제** · 캐릭터 선택을 바꿀수록 메모리 사용량이 계속 늘고 프레임이 떨어졌습니다.

**해결** · 씬에 들어올 때 슬롯별 캐릭터를 모두 만들어 두고, 선택이 바뀌면 생성 · 해제 대신 표시할 캐릭터만 바꾸게 했습니다.

</div>

### 문제 상황

플레이어 세 명이 각자 캐릭터를 고르고, 같은 캐릭터를 동시에 고를 수도 있어 슬롯마다 미리보기가 필요했습니다. 처음에는 선택이 바뀔 때마다 모델을 새로 만들고 이전 모델을 해제했는데, 선택을 반복할수록 메모리 사용량이 늘고 반응이 느려졌습니다.

<img class="detail-img" src="{{ '/assets/img/character.gif' | relative_url }}" alt="캐릭터 선택 화면에서 슬롯마다 캐릭터를 바꾸는 시연" loading="lazy">

### 원인 분석

캐릭터 모델은 메시 · 스켈레톤 · 애니메이션을 한 파일에 담은 자체 바이너리 형식이라, **한 번 만드는 비용 자체가 컸습니다.** 여기에 반복 생성 · 해제 과정에서 일부 그래픽 리소스가 완전히 반환되지 않으면서 메모리 증가와 반응 저하가 함께 나타났습니다.

DX12에서는 GPU가 아직 쓰고 있는 리소스를 CPU가 먼저 해제하지 않도록 해제 시점을 직접 관리해야 합니다. 선택할 때마다 생성 · 해제를 되풀이하는 구조는 이 관리를 화면 조작 빈도만큼 늘리는 셈이라, 누수를 하나씩 막기보다 **생성 · 해제 자체를 없애는 쪽**을 택했습니다.

### 해결 과정

- **씬 진입 시 일괄 생성** — 더미를 포함한 4종 캐릭터를 3개 슬롯분, 총 12개 미리 만듭니다. 업로드 버퍼는 GPU 전송이 끝난 뒤 한 번에 해제합니다.
- **선택은 표시 전환만** — 선택이 바뀌면 해당 슬롯에서 보여 줄 캐릭터만 바꾸고, 모델을 새로 읽거나 지우지 않습니다.

```cpp
// 3개 슬롯 × 4종 캐릭터를 씬 진입 시 한 번만 생성
for (int j = 0; j < 3; j++)
{
    for (int i = 0; i < 4; ++i) {
        CyborgPlayer* pPlayer = new CyborgPlayer(pd3dDevice, pd3dCommandList,
            GetGraphicsRootSignature(), m_pTerrain, m_ppModelInfoPlayer[i + j * 4]);
        m_ppPlayer[i + j * 4] = pPlayer;
        m_ppPlayer[i + j * 4]->SetPlayerData(i);
    }
}
```

### 결과와 한계

선택을 반복해도 메모리가 늘지 않고, 캐릭터가 바로 바뀝니다. **누수를 쫓는 대신 누수가 생길 수 있는 작업을 구조에서 없앤 사례**입니다.

12개를 항상 메모리에 두는 방식이라 캐릭터 수가 적은 이 프로젝트 규모에서만 맞는 선택입니다. 캐릭터가 많아지면 한 번 읽은 모델 데이터를 슬롯끼리 공유하는 방식이 필요합니다.

**구현 코드:** [PrepareScene.cpp — 캐릭터 미리 생성][src-prepare]

<a id="mission-sync"></a>

## 03. 협동 미션에서 다른 플레이어 상태가 반영되지 않던 문제

**패킷 필드 정의 · 서버 연결 ID와 캐릭터 슬롯 · 팀 단위 추적**

<div class="experience-summary" markdown="1">

**문제** · 두 플레이어가 동시에 장치를 작동해야 하는 Stage 2 미션에서, 다른 플레이어의 동작이 게이지에 반영되지 않았습니다.

**해결** · 서버 담당 팀원과 패킷 흐름을 단계별로 추적해 서버 두 곳 · 클라이언트 한 곳의 원인을 찾아 고쳤습니다.

</div>

### 문제 상황

Stage 2는 두 플레이어가 동시에 장치를 켜야 게이지가 오르는 협동 미션입니다. 클라이언트는 장치가 켜진 수가 둘 이상일 때(`check > 1`) 게이지를 올리고, 다른 플레이어의 상태는 서버가 중계한 패킷으로 갱신합니다. 그런데 다른 플레이어가 장치를 켜도 내 화면에는 반영되지 않았습니다.

<img class="detail-img" src="{{ '/assets/img/mission2.png' | relative_url }}" alt="Stage 2 동시 인터랙션 미션 화면" loading="lazy">

### 원인 분석

한 군데의 실수가 아니라 **ID를 다루는 세 지점이 서로 다른 값을 같은 뜻으로 쓰고 있었습니다.**

| 위치 | 잘못된 점 | 결과 |
|---|---|---|
| 서버 — 플레이어 상태 패킷 | 게임 ID 자리에 서버 내부 연결 ID(`c_id`)를 담음 | 클라이언트가 다른 플레이어로 해석 |
| 서버 — 패킷 전송 | 패킷 구조체 대신 포인터 변수의 주소(`&p`)를 전송 | 의미 없는 값이 전달됨 |
| 클라이언트 — 패킷 처리 | 플레이어 배열을 서버 연결 ID로 접근 | 배열은 캐릭터 타입 기준이라 엉뚱한 슬롯이 갱신됨 |

### 해결 과정

서버 담당 팀원과 같은 상황을 재현하며, 보낸 값과 받은 값을 지점마다 맞춰 보는 방식으로 원인을 좁혔습니다. 서버 쪽 두 곳은 서버 담당 팀원이, 클라이언트 쪽은 제가 고쳤습니다.

```cpp
// 서버 — 게임 ID를 담고, 패킷 구조체를 전송
alivePacket.id = p->id;          // 수정 전: c_id
clients[id].do_send(&comst);     // 수정 전: &p

// 클라이언트 — 받은 ID를 캐릭터 타입으로 바꿔 슬롯에 적용
auto& it = idANDtype.find(id);
if (it != idANDtype.end())
    reinterpret_cast<CyborgPlayer*>(m_ppPlayer[it->second])->SetCrawl(false);   // 수정 전: m_ppPlayer[id]
```

### 결과와 한계

두 플레이어가 장치를 동시에 켜면 양쪽 화면 모두 게이지가 오릅니다. **멀티플레이 버그는 패킷 필드와 인덱스 체계를 팀 전체가 같은 뜻으로 이해하는 데서 풀린다**는 것을 확인한 사례입니다.

연결 ID · 게임 ID · 캐릭터 타입이라는 세 가지 식별자가 그대로 남아 있어, 새 패킷을 추가할 때마다 어떤 ID를 담는지 다시 맞춰야 합니다. 패킷마다 필드의 의미를 문서로 정해 두는 것이 다음 과제였습니다.

**구현 코드:** [PlayScene.cpp — 패킷 처리 · 미션 게이지][src-playscene] · [Server.cpp — 서버 수정 지점][src-server]

<a id="rendering"></a>

## 04. MRT 기반 디퍼드 렌더링과 섀도우 맵

**Multiple Render Targets · 합성 패스 · 광원 시점 깊이 패스 · PCF · 깊이 바이어스 · 텍셀 스냅**

<div class="experience-summary" markdown="1">

**구현** · 한 번의 지오메트리 패스로 표면 색 · 조명 · 그림자 계수를 여러 렌더 타깃에 나눠 기록하고, 화면 전체 합성 패스에서 섞어 최종 색을 만듭니다. 그림자는 광원 시점 깊이 맵과 25탭 PCF로 계산합니다.

**문제 해결** · 졸업 후 다시 점검하니 섀도우 맵이 화면에 반영되지 않고 있었습니다. 값이 지나가는 경로를 끊어 보며 원인 다섯 가지를 고쳤고, 그림자가 나온 뒤 드러난 품질 문제(경계 번짐 · 얼룩 · 이동 중 깜빡임)까지 이어서 해결했습니다.

</div>

### 렌더링 구조

지오메트리 패스는 백버퍼와 G-Buffer 렌더 타깃 4개를 **동시에 바인딩**하고, 픽셀 셰이더 한 번으로 아래 값을 나눠 씁니다.

| 렌더 타깃 | 담는 값 | 만드는 방법 |
|---|---|---|
| 0 · 1 | 표면 색 | 알베도 · 스페큘러 · 메탈릭 · 이미션 맵을 가중 합산 |
| 2 | 그림자를 반영한 조명 | 노멀 맵에서 읽은 법선으로 조명을 계산하고, 광원마다 그림자 계수를 곱함 |
| 3 | 그림자 없는 조명 | 같은 법선으로 계산한 조명 |
| 4 (R32F) | 그림자 계수 | 섀도우 맵 PCF 결과 (0 = 완전한 그림자, 1 = 빛) |

조명은 지오메트리 패스에서 법선으로 계산해 결과를 저장하는 구조입니다. 합성 패스는 화면을 덮는 사각형에서 이 렌더 타깃들을 읽어 **표면 색과 조명을 섞고, 그림자 계수만큼 어둡게** 만듭니다. 그림자 속도 완전히 검지 않도록 최소 밝기를 두고, 마지막에 전체 노출로 장면의 톤을 맞춥니다.

```hlsl
// 합성 패스
float4 outcolor = lerp(color, normallight, 0.4f);          // 표면 색 + 조명
outcolor.rgb *= lerp(SHADOW_MIN_INTENSITY, 1.0f, fShadow);  // PCF 그림자 계수 적용
outcolor.rgb *= SCENE_EXPOSURE;                             // 전체 노출
```

**섀도우 맵** — 깊이 패스가 광원 시점에서 장면을 그려 광원마다 깊이 텍스처(R32F)를 만듭니다. 정점 셰이더가 각 정점을 광원 텍스처 공간으로 옮겨 두면, 픽셀 셰이더가 비교 샘플러로 주변 25곳을 읽어(PCF) 그림자 계수를 구합니다. 방향광은 위치가 의미 없으므로, 섀도우 카메라가 **플레이어 시점을 따라 움직이며** 넓은 영역을 덮게 했습니다. 해는 고도 20° · 방위 45°의 낮은 각도로 두었고, 섀도우 카메라도 같은 방향을 따라가므로 면의 명암과 그림자 방향이 어긋나지 않습니다.

디버그 키(F6)로 합성 결과 · 표면 색 · 그림자 반영 조명 · 그림자 없는 조명 · 그림자 계수를 하나씩 띄워 볼 수 있습니다.

### 문제 상황

졸업 후 렌더링을 다시 점검하면서, 깊이 패스와 PCF 셰이더가 모두 구성돼 있는데도 화면의 어두운 부분이 섀도우 맵에서 나온 것이 아님을 확인했습니다. 당시 합성 패스는 조명 값이 일정 수준 아래면 색을 깎는 방식(`if (light.x < 0.2) outcolor -= 0.4`)이었고, 그림자처럼 보이던 것은 이 계단식 처리의 결과였습니다.

경로를 고쳐 그림자가 실제로 나오자 이번에는 품질 문제가 드러났습니다. 그림자 경계가 넓게 번지며 줄무늬가 생기고, 빛을 받는 바닥에 얼룩이 남고, 플레이어가 움직일 때마다 경계가 깜빡였습니다.

### 원인 분석

PCF 계산식만 보면 정상이었습니다. 그래서 그림자 계수를 G-Buffer에 직접 실어 디버그 뷰로 띄우고, **값이 만들어지는 곳 → 저장되는 곳 → 읽히는 곳**을 차례로 끊어 확인했습니다.

**1단계 — 그림자가 화면에 나오지 않음.** 원인은 한 곳이 아니라 다섯 단계에 흩어져 있었습니다.

| 단계 | 원인 | 결과 |
|---|---|---|
| 깊이 패스 생성 | 깊이 패스 PSO의 렌더 타깃 형식이 `D32_FLOAT`(렌더 타깃으로 쓸 수 없는 형식). 생성 실패를 확인하지 않아 조용히 넘어감 | 깊이 패스가 한 번도 그려지지 않음 |
| 깊이 패스 그리기 | 오브젝트를 그릴 때마다 재질 셰이더가 자기 PSO로 바꿔 끼움 | 섀도우 맵에 깊이 대신 색이 기록됨 |
| 깊이 값 저장 | 모든 셰이더가 공유하는 블렌드 상태(알파 블렌드)가 1채널 렌더 타깃에도 적용됨 | 기록한 깊이 · 그림자 계수가 버려지고 초깃값만 남음 |
| 섀도우 카메라 | 광원 시점 영역이 고정 위치 · 고정 크기라 맵을 다 덮지 못함 | 화면 절반이 섀도우 맵 밖 |
| 조명 입력 | 그림자 조명 함수에 법선 대신 상수가 들어감 | 그림자 쪽 조명의 방향 계산이 무의미 |

**2단계 — 그림자가 나온 뒤의 품질 문제.**

| 증상 | 원인 |
|---|---|
| 경계가 넓게 번지고 줄무늬가 생김 | 셰이더에 섀도우 맵 크기를 1960×1080으로 따로 적어 두었는데, 실제 리소스는 C++에서 3840×2160으로 만들어짐. PCF 25탭이 1텍셀이 아니라 약 2텍셀 간격으로 찍힘 |
| 빛을 받는 면에 얼룩(섀도우 애크니) | 비교할 깊이에 바이어스가 없었음. 래스터라이저 깊이 바이어스는 깊이 버퍼(DSV)에만 적용되는데, 실제로 읽는 맵은 픽셀 셰이더가 직접 쓴 R32 렌더 타깃이라 반영되지 않음 |
| 움직일 때 경계가 깜빡임 | 섀도우 카메라가 시점을 연속으로 따라가, 매 프레임 섀도우 맵이 텍셀 일부만큼 밀림 |

### 해결 과정

**1단계**

- **생성 실패를 드러냄** — 렌더 타깃 형식을 `R32_FLOAT`로 바로잡고, PSO 생성 결과를 검사해 실패하면 디버그 출력과 중단점이 걸리게 했습니다.
- **깊이 패스 동안 재질 셰이더 차단** — 깊이 패스 중에는 오브젝트가 자기 PSO를 바인딩하지 않도록 패스 플래그를 두었습니다.
- **렌더 타깃별 블렌드** — 독립 블렌드를 켜고, 색 렌더 타깃만 알파 블렌드 · 1채널 렌더 타깃(그림자 계수 · 깊이)은 블렌드를 껐습니다. 깊이 패스는 블렌드 상태를 따로 두었습니다.
- **섀도우 카메라 추적** — 방향광 카메라를 플레이어 시점 위로 따라가게 하고 영역 크기를 넓혔습니다.
- **그림자 계수 직접 전달** — 계단식 처리를 없애고, PCF 결과를 렌더 타깃 4번에 실어 합성 패스가 그대로 쓰게 했습니다.

**2단계**

- **텍셀 크기를 텍스처에서 읽음** — 셰이더의 크기 상수를 지우고 `GetDimensions`로 섀도우 맵 크기를 얻어, PCF 간격을 정확히 1텍셀로 맞췄습니다. 크기가 리소스를 만드는 C++ 한 곳에만 정의됩니다.
- **기울기 비례 바이어스** — 법선과 광원 방향 사이 각도의 tan 값에 비례하는 바이어스를 비교 깊이에서 빼고, 상한을 두었습니다. 값은 월드 단위로 정하고 광원 투영의 깊이 범위로 나눠 적용합니다.
- **텍셀 스냅** — 월드 원점이 광원 투영에서 늘 섀도우 맵 텍셀 경계에 오도록 투영 행렬의 평행 이동을 반올림 오차만큼 보정했습니다. 카메라가 움직여도 텍셀 격자가 월드에 고정되어 한 텍셀 단위로만 이동합니다.

```hlsl
// 기울기 비례 바이어스: 빛이 비스듬할수록 크게, 상한을 둠
float fNdotL    = clamp(dot(vNormal, vToLight), 0.05f, 1.0f);
float fTanTheta = sqrt(1.0f - fNdotL * fNdotL) / fNdotL;
float fBias     = min(SHADOW_BIAS_CONSTANT + SHADOW_BIAS_SLOPE * fTanTheta, SHADOW_BIAS_MAX);
float fShadow   = Compute3x3ShadowFactor(uv, depth - fBias, i);
```

```cpp
// 텍셀 스냅: 월드 원점이 섀도우 맵 텍셀 경계에 오도록 투영을 보정
XMVECTOR xmvOrigin       = XMVector3TransformCoord(XMVectorZero(), xmmtxLightView * xmmtxProjection);
XMVECTOR xmvHalfTexels   = XMVectorSet(_DEPTH_BUFFER_WIDTH * 0.5f, _DEPTH_BUFFER_HEIGHT * 0.5f, 1.0f, 1.0f);
XMVECTOR xmvOriginTexels = XMVectorMultiply(xmvOrigin, xmvHalfTexels);
XMVECTOR xmvSnapOffset   = XMVectorDivide(XMVectorSubtract(XMVectorRound(xmvOriginTexels), xmvOriginTexels), xmvHalfTexels);
xmmtxProjection.r[3]     = XMVectorAdd(xmmtxProjection.r[3],
                               XMVectorSet(XMVectorGetX(xmvSnapOffset), XMVectorGetY(xmvSnapOffset), 0.0f, 0.0f));
```

### 결과와 한계

<div style="display:flex; gap:8px; margin:16px 0;">
  <div style="flex:1; text-align:center;">
    <img class="detail-img" src="{{ '/assets/img/cyberz-shadow-before.webp' | relative_url }}" alt="수정 전: 섀도우 맵이 반영되지 않아 그림자가 없는 화면" loading="lazy">
    <p style="font-size:0.85em; color:#888; margin-top:4px;">수정 전 — 섀도우 맵이 반영되지 않음</p>
  </div>
  <div style="flex:1; text-align:center;">
    <img class="detail-img" src="{{ '/assets/img/cyberz-shadow-after.webp' | relative_url }}" alt="수정 후: 기둥과 건물의 그림자가 바닥에 드리운 화면" loading="lazy">
    <p style="font-size:0.85em; color:#888; margin-top:4px;">수정 후 — 섀도우 맵 그림자 · 낮은 해 · 노출 조정</p>
  </div>
</div>

그림자 계수가 계단 없이 합성 단계까지 전달되고, 경계 번짐과 바닥 얼룩이 사라졌습니다. 이동할 때 경계가 흔들리던 현상도 한 텍셀 단위의 이동만 남도록 줄였습니다. **계산식이 아니라 값이 지나가는 전 경로를 확인해야 한다**는 것, 공유 상태(블렌드 · PSO)가 새 패스에 조용히 영향을 준다는 것, 그리고 **셰이더와 C++에 같은 값을 따로 두면 어긋난다**는 것을 확인한 사례입니다.

- 깊이 패스가 정적 메시용 정점 셰이더를 써서, 스키닝 캐릭터는 기본 자세로 그림자가 생깁니다.
- 캐스케이드 없이 직교 영역 하나로 덮고 있어 가까운 곳과 먼 곳의 해상도가 같고, 정사각 영역을 16:9 맵에 담아 가로 · 세로 텍셀 크기가 다릅니다.
- 해가 낮아 바이어스 상한을 크게 잡았기 때문에, 물체가 바닥에 닿는 부분에 틈이 보일 수 있습니다. 법선 방향으로 위치를 밀어 비교하는 방식이 다음 개선점입니다.
- 깊이를 R32 렌더 타깃에 직접 쓰는 구조라 하드웨어 깊이 바이어스를 쓰지 못합니다. 깊이 버퍼를 그대로 셰이더에서 읽는 깊이 전용 패스로 바꾸는 것이 근본적인 개선입니다.
- 바이어스 계산에 쓰는 깊이 범위가 C++ 상수와 셰이더에 따로 정의돼 있어, 상수 버퍼로 넘기는 것이 맞습니다. 법선 맵에 TBN 변환을 적용하는 것도 남은 과제입니다.

**구현 코드:** [Shaders.hlsl — MRT 출력 · 합성][src-shaders] · [Light.hlsl — PCF 그림자][src-light] · [Shader.cpp — 깊이 패스 · 블렌드 상태][src-shader]

<a id="supporting-work"></a>

## 게임을 구성하는 보조 구현

핵심 사례 외에 화면 UI와 플레이어 충돌 처리를 맡았습니다.

<a id="ui-overlay"></a>
<details class="collapse-block" markdown="1">
<summary class="btn">DirectX 12 위의 2D UI (D3D11On12 · Direct2D) <span class="chevron">▾</span></summary>

DirectX 12에는 2D 도형 · 텍스트를 그리는 API가 없고, Direct2D · DirectWrite는 D3D11 계열 장치 위에서 동작합니다. 그래서 **두 API가 같은 백버퍼를 순서대로 쓰도록** D3D11On12로 연결했습니다.

- **장치 연결** — `D3D11On12CreateDevice`로 DX12 명령 큐를 공유하는 D3D11 장치를 만들고, 그 위에 Direct2D 장치를 만듭니다.
- **백버퍼 래핑** — 스왑체인 백버퍼마다 `CreateWrappedResource`로 D3D11 리소스를 만들고, `CreateBitmapFromDxgiSurface`로 Direct2D 렌더 타깃을 얻습니다.
- **그리는 순서** — 3D 렌더가 끝난 백버퍼를 Acquire → Direct2D로 UI를 그림 → Release · Flush 순서로 넘겨, 별도 렌더 타깃이나 합성 단계 없이 같은 백버퍼에 UI가 얹힙니다.
- **컴포넌트** — 버튼 · 텍스트 입력 · 진행 게이지 · WIC 이미지를 만들고, 씬마다 독립된 UI 인스턴스로 관리합니다.
- **한계** — 매 프레임 래핑 리소스를 넘겨받고 돌려주는 과정과 `Flush`가 더해져, UI를 그리는 비용이 DX12만 쓸 때보다 큽니다.

```cpp
void CUI::DrawUI(UINT m_nSwapChainBufferIndex)
{
    m_pd2dDeviceContext->SetTarget(m_ppd2dRenderTargets[m_nSwapChainBufferIndex]);
    ID3D11Resource* ppd3dResources[] = { m_ppd3d11WrappedBackBuffers[m_nSwapChainBufferIndex] };
    m_pd3d11On12Device->AcquireWrappedResources(ppd3dResources, _countof(ppd3dResources));

    m_pd2dDeviceContext->BeginDraw();
    // ... 버튼 · 텍스트 · 게이지 그리기
    m_pd2dDeviceContext->EndDraw();

    m_pd3d11On12Device->ReleaseWrappedResources(ppd3dResources, _countof(ppd3dResources));
    m_pd3d11DeviceContext->Flush();
}
```

<img class="detail-img" src="{{ '/assets/img/UI.gif' | relative_url }}" alt="Direct2D UI 오버레이 시연" loading="lazy">

**구현 코드:** [GUI.cpp — D3D11On12 연결 · UI 그리기][src-gui]

</details>

<details class="collapse-block" markdown="1">
<summary class="btn">충돌 처리 <span class="chevron">▾</span></summary>

멀티플레이 환경에서 충돌을 서버에만 맡기면 네트워크 지연 때문에 벽을 잠깐 통과하는 것처럼 보이고, 클라이언트에만 맡기면 위치 조작에 약해집니다. 그래서 **클라이언트가 먼저 충돌을 계산해 바로 반응하고, 서버가 최종 위치를 보내 보정**하는 구조로 만들었습니다.

- **바운딩 박스 기반** — 모델 파일에 담긴 메시 바운딩 박스(중심 · 크기)를 읽고, 오브젝트의 월드 행렬로 변환해 `BoundingOrientedBox`로 판정합니다.
- **이동 전에 미리 검사** — 이번 프레임의 이동량만큼 박스를 먼저 옮겨(`UpdateBoundingBox`) 부딪힐지 확인한 뒤 실제 이동을 결정합니다.
- **판정 대상** — 플레이어와 맵 오브젝트, 플레이어끼리의 충돌, 미션 장치의 작동 범위 판정을 같은 구조로 처리합니다.
- **서버 보정** — 서버가 `send_update_packet`으로 최종 위치를 보내면 클라이언트는 받은 위치로 덮어씁니다.
- **팀원 확장** — 충돌한 면의 법선을 구해 벽을 따라 미끄러지게 하는 슬라이딩 벡터 보정은 다른 클라이언트 팀원이 이 구조 위에 추가했습니다.

**구현 코드:** [Scene.cpp — 충돌 판정][src-scene] · [Object.cpp — 바운딩 박스 월드 변환][src-object]

</details>

<a id="role"></a>

## 담당 범위

3명이 클라이언트 2명 · 서버 1명으로 나눠 개발했습니다. 저는 클라이언트에서 아래 영역을 맡았습니다.

| 영역 | 맡은 일 |
|---|---|
| 프레임워크 | DX12 초기화, 프레임 루프, 씬 인터페이스 · 씬 전환, GPU 리소스 생명주기 |
| 렌더링 | MRT 지오메트리 · 합성 패스, 섀도우 맵 깊이 패스 · PCF, HLSL 셰이더 |
| UI | D3D11On12 · Direct2D 오버레이, 버튼 · 입력창 · 게이지 컴포넌트 |
| 게임플레이 | 캐릭터 선택 화면, 바운딩 박스 충돌 판정, Stage 2 협동 미션의 클라이언트 처리 |

**팀원과의 경계**

- IOCP 서버와 패킷 중계는 서버 담당 팀원이 맡았습니다. 협동 미션 버그는 함께 추적했고, 서버 쪽은 팀원이 · 클라이언트 쪽은 제가 고쳤습니다.
- 충돌의 슬라이딩 벡터 보정은 다른 클라이언트 팀원이 제 충돌 구조 위에 추가했습니다.
- 섀도우 맵 문제의 재점검과 수정은 졸업 후 개인적으로 진행했습니다. 원인 후보를 좁히고 개선안을 비교하는 과정에서 AI(Claude Code)의 조언을 받았습니다.

<div class="card-links" style="margin-top: 32px;">
  <a class="btn btn-primary" href="{{ '/' | relative_url }}#cyberz">← 프로젝트 목록으로</a>
  <a class="btn" href="https://github.com/KimJinsun610/CyberZ" target="_blank" rel="noopener noreferrer">전체 코드 보기</a>
</div>

<nav class="floating-toc" id="floatingToc" aria-label="CyberZ 상세 목차">
  <p class="ftoc-title">주요 구현</p>
  <ol>
    <li><a href="#framework">게임 프레임워크</a></li>
    <li><a href="#character-preload">캐릭터 선택 리소스</a></li>
    <li><a href="#mission-sync">협동 미션 동기화</a></li>
    <li><a href="#rendering">MRT 렌더링 · 섀도우 맵</a></li>
    <li><a href="#supporting-work">보조 구현</a></li>
    <li><a href="#role">담당 범위</a></li>
  </ol>
</nav>

<a class="scroll-up-left" id="scrollUpLeft" href="#" aria-label="맨 위로 이동">↑</a>

<script>
  (function () {
    var btn = document.getElementById('scrollUpLeft');
    var toc = document.getElementById('floatingToc');
    var links = Array.from(toc.querySelectorAll('a'));
    var sections = links.map(function (link) {
      return document.getElementById(link.hash.slice(1));
    });
    var trigger = document.querySelector('.detail-toc');
    function onScroll() {
      btn.classList.toggle('visible', window.scrollY > 300);
      toc.classList.toggle('visible', trigger.getBoundingClientRect().bottom < 0);
      var current = -1;
      sections.forEach(function (section, i) {
        if (section && section.getBoundingClientRect().top <= 100) current = i;
      });
      links.forEach(function (link, i) {
        link.classList.toggle('ftoc-active', i === current);
        if (i === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('load', onScroll);
    onScroll();
  })();
</script>

[src-prepare]: https://github.com/KimJinsun610/CyberZ/blob/31cc83c9cac94c534ec4c2b63516ebb2e39c3bf4/Client/PrepareScene.cpp
[src-playscene]: https://github.com/KimJinsun610/CyberZ/blob/31cc83c9cac94c534ec4c2b63516ebb2e39c3bf4/Client/PlayScene.cpp
[src-server]: https://github.com/KimJinsun610/CyberZ/blob/31cc83c9cac94c534ec4c2b63516ebb2e39c3bf4/Server/Server.cpp
[src-gui]: https://github.com/KimJinsun610/CyberZ/blob/31cc83c9cac94c534ec4c2b63516ebb2e39c3bf4/Client/GUI.cpp
[src-framework]: https://github.com/KimJinsun610/CyberZ/blob/31cc83c9cac94c534ec4c2b63516ebb2e39c3bf4/Client/GameFramework.cpp
[src-shaders]: https://github.com/KimJinsun610/CyberZ/blob/31cc83c9cac94c534ec4c2b63516ebb2e39c3bf4/Client/Shaders.hlsl
[src-shader]: https://github.com/KimJinsun610/CyberZ/blob/31cc83c9cac94c534ec4c2b63516ebb2e39c3bf4/Client/Shader.cpp
[src-scene]: https://github.com/KimJinsun610/CyberZ/blob/31cc83c9cac94c534ec4c2b63516ebb2e39c3bf4/Client/Scene.cpp
[src-object]: https://github.com/KimJinsun610/CyberZ/blob/31cc83c9cac94c534ec4c2b63516ebb2e39c3bf4/Client/Object.cpp
[src-scene-h]: https://github.com/KimJinsun610/CyberZ/blob/31cc83c9cac94c534ec4c2b63516ebb2e39c3bf4/Client/Scene.h
[src-light]: https://github.com/KimJinsun610/CyberZ/blob/31cc83c9cac94c534ec4c2b63516ebb2e39c3bf4/Client/Light.hlsl
