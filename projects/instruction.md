---
layout: page
title: Instruction
permalink: /projects/instruction/
---

<div class="instruction-detail case-detail">
<div class="instruction-summary tag-row" role="list" aria-label="주요 구현 기술">
  <span class="tag" role="listitem">URP 뷰모델 렌더링</span>
  <span class="tag" role="listitem">HLSL 화면 효과</span>
  <span class="tag" role="listitem">절차적 애니메이션</span>
  <span class="tag" role="listitem">동적 수면 메시</span>
  <span class="tag" role="listitem">게임 시간 제어</span>
  <span class="tag" role="listitem">Timeline 컷신</span>
</div>
<div class="card-links">
  <a class="btn" href="https://github.com/KimJinsun610/NCAI_BrokenCompass" target="_blank" rel="noopener noreferrer">GitHub</a>
  <a class="btn" href="https://youtu.be/4G3LkPagvS8" target="_blank" rel="noopener noreferrer">게임플레이 영상</a>
  <a class="btn" href="#development">담당 범위 · AI 활용 방식</a>
</div>
</div>

폐교의 야간 경비원이 되어 근무수칙을 지키며 순찰하는 **1인칭 규칙 준수 공포 게임**입니다. 위험을 수치·게이지로 보여 주지 않고, 학교의 변화와 태블릿 메시지로 전달합니다. 저는 이 정보를 플레이어가 보고 듣고 조작하는 **클라이언트 영역**을 담당했습니다.

| 항목 | 내용 |
|---|---|
| 기간 · 인원 | 2026.08.27 ~ 2026.10.15 (8주) · 4명 (프로그래머 2, 기획 1, 아트 1) |
| 담당 | 게임 플로우 · 1인칭 플레이 · 태블릿 · 공포 연출 · 화면 효과 · 형상관리 |
| 환경 | C# · Unity 6 (6000.3) · URP 17 (Forward+) · Timeline · DOTween |
| 개발 방식 | Claude Code로 대부분의 코드 작성 · 요구사항 정의, 플레이 검증, 버그 재현 조건 정리와 팀 연동 담당 |

<div class="box_highlight">🏆 <strong>우수상 — 참여 팀 중 1팀 선정</strong><br>2026 미래내일 일경험사업 「Design Your World : VARCO로 완성하는 게임 직무」(참여기업 NC AI) · BrokenCompass 팀</div>

## 주요 구현과 문제 해결

<nav class="detail-toc" aria-label="Instruction 기술 사례">
  <a href="#render-isolation">01 렌더링·조명 분리</a>
  <span class="toc-sep">/</span>
  <a href="#time-control">02 시간 제어</a>
  <span class="toc-sep">/</span>
  <a href="#animation-correction">03 본 회전 보정</a>
  <span class="toc-sep">/</span>
  <a href="#rendering-effects">셰이더·메시·컷신</a>
  <span class="toc-sep">/</span>
  <a href="#supporting-work">보조 구현</a>
</nav>

<a id="render-isolation"></a>

## 01. URP Camera Stacking 기반 뷰모델 렌더링·조명 분리

**URP Camera Stacking · Culling Mask · Rendering Layers**

<div class="experience-summary" markdown="1">

**문제** · 씬의 조명·후처리가 손과 태블릿에도 적용되어 정보를 읽기 어려워졌습니다.

**해결** · 카메라의 표시 대상과 조명의 적용 대상을 따로 분리하고, URP에서 실제로 사용하는 라이트 데이터의 설정까지 수정했습니다.

</div>

### 문제 상황

태블릿은 근무수칙과 메시지를 읽는 핵심 인터페이스입니다. 그런데 실내 볼륨의 노출 보정·블룸을 적용하자 화면이 하얗게 날아가고, 손전등의 빛이 손과 태블릿에도 닿았습니다. 공간의 분위기를 위한 조명 설정이 플레이에 필요한 정보까지 훼손한 것입니다.

해결의 기준은 **월드의 조명·후처리는 유지하면서, 손과 태블릿의 표시 조건을 독립적으로 제어하는 것**이었습니다.

<figure class="instruction-media">
  <img class="detail-img" src="{{ '/assets/img/instruction-tablet.gif' | relative_url }}" alt="손에 든 태블릿에서 수칙과 메시지를 확인하는 플레이 시연" width="549" height="485" loading="lazy">
  <figcaption>태블릿 플레이 시연. 들기·내리기, 화면 UI와 1인칭 연출을 함께 담당했습니다.</figcaption>
</figure>

### 원인 분석과 해결 방향

카메라의 **Culling Mask는 무엇을 그릴지**, 조명의 **Rendering Layers는 무엇을 비출지** 결정합니다. 카메라만 나누면 씬 조명이 뷰모델에 닿는 문제는 남습니다. 화면 합성과 조명 적용을 별개의 문제로 보고, 두 경계를 함께 분리했습니다.

월드와 뷰모델의 설정은 다음과 같이 나눴습니다.

| 구분 | 월드 | 손·태블릿(뷰모델) |
|---|---|---|
| 그리는 카메라 | 메인 Base 카메라 | 스택에 추가한 Overlay 카메라 |
| 표시 대상 | 뷰모델 레이어 제외 | 뷰모델 레이어만 포함 |
| 후처리 | 씬의 공포 연출 유지 | Overlay 카메라의 후처리 비활성화 |
| 조명 | 씬 조명·손전등 | 뷰모델 전용 Rendering Layer와 전용 조명 |

### 해결 과정

분리한 설정은 `ViewmodelRig` 한 컴포넌트에 모았습니다. 시작할 때 뷰모델 하위 오브젝트와 Renderer에 전용 레이어를 적용하고, 메인 카메라에서 해당 대상을 제외합니다. 이어서 뷰모델만 그리는 Overlay 카메라와 전용 조명을 런타임에 생성합니다.

- **카메라 분리** — 메인 카메라의 FOV를 기준으로 Overlay 카메라를 구성하고 `cameraStack`에 추가합니다. 후처리는 끄고 깊이를 별도로 처리해 월드에 의해 손이 잘려 보이는 현상을 줄였습니다.
- **조명 분리** — 씬 조명의 Rendering Layers에서 뷰모델 비트를 제외하고, 전용 조명에는 그 비트만 설정합니다.
- **수명 관리** — `OnDestroy`에서 생성한 카메라를 스택에서 제거하고, 카메라·조명 오브젝트를 정리합니다.

### 구현 중 추가로 해결한 문제

<div class="ts-box" markdown="1">

기존 작업에서는 `Light.renderingLayerMask`를 조정해도 씬 조명이 계속 영향을 주었습니다. 이 프로젝트의 URP 설정에서 사용하는 `UniversalAdditionalLightData.renderingLayers`를 수정하도록 처리 지점을 바꿨습니다.

`GetUniversalAdditionalLightData()`로 URP의 추가 라이트 데이터를 얻고, `renderingLayers`에서 뷰모델 비트를 제거했습니다. `customShadowLayers`가 켜진 라이트는 그림자 레이어도 함께 조정했습니다.

</div>

### 결과와 한계

씬의 공포 분위기를 유지하면서 태블릿 밝기는 전용 조명으로 조정할 수 있게 했습니다. **화면 합성과 조명 영향을 별개의 문제로 나누고, 각각의 제어 지점을 찾은 것**이 이 사례의 핵심입니다.

이 구성은 1인칭 뷰모델의 가독성을 우선합니다. 깊이 분리는 벽과 손의 물리적 충돌을 해결하는 방식은 아니며, Overlay 후처리 비활성화도 모든 렌더러 기능의 영향을 일괄 차단한다는 의미는 아닙니다.

**구현 코드:** [ViewmodelRig.cs — 레이어 적용, 카메라 스택, 조명 분리][source-rig]

<a id="time-control"></a>
<a id="sec-2"></a>

## 02. 요청 소유권 기반 게임 시간 제어

**요청 소유권 · HashSet · 게임 시간과 연출 시간의 분리**

<div class="experience-summary" markdown="1">

**문제** · 한 연출이 정지를 해제하면, 다른 시스템이 정지를 요청한 상태에서도 근무 시계가 다시 흘렀습니다.

**해결** · 단일 상태값을 요청 주체별 Hold / Release 구조로 바꾸고, 근무 시계·전체 일시정지·뷰모델 시간의 책임을 나눴습니다.

</div>

### 문제 상황

하루 시작 안내와 태블릿이 각각 근무 시계를 멈추던 시기에, 안내가 끝나면서 시계를 다시 켜면 태블릿이 열려 있어도 시간이 흐르는 문제가 있었습니다.

### 원인 분석과 해결 방향

여러 호출부가 하나의 `bool`을 바꾸는 구조에서는 **마지막으로 쓴 값이 다른 주체의 의도까지 덮어썼습니다.** 정지 여부만 저장하는 대신 누가 정지를 요청했는지 보관하고, 자신의 요청만 해제하도록 바꿨습니다.

여기에 전체 일시정지, 시간 감속, 손·태블릿 연출이 더해지면서 “멈춘다”는 상태를 하나로 취급할 수 없었습니다. 근무 시계의 정지와 게임 전체의 일시정지를 구분했습니다.

### 해결 과정

**요청이 모두 해제되어야 시계가 진행할 수 있도록** 구성했습니다. 아래는 두 주체 A·B가 근무 시계 정지를 요청하는 순서를 설명한 예시입니다.

| 호출 | 남아 있는 요청 주체 | 근무 시계 |
|---|---|---|
| `Hold(A)` | A | 정지 |
| `Hold(B)` | A, B | 정지 |
| `Release(A)` | B | 정지 유지 |
| `Release(B)` | 없음 | 진행 가능 |

진행 가능 상태에서도 전체 일시정지로 `Time.deltaTime`이 0이면 시계는 흐르지 않습니다. **개별 요청의 해제와 실제 시간 진행을 구분**한 구조입니다.

**요청 주체를 저장하는 자료구조와 시간축 분리**

`GameTime`은 `HashSet<object>`에 요청 주체를 보관합니다. 동일한 주체의 중복 요청은 한 번으로 처리되고, 해제할 때는 자신의 요청만 제거합니다. 단순 증가·감소 카운터와 달리 중복 호출 때문에 정지 횟수가 늘어나지 않습니다.

아래는 실제 `GameTime.cs`의 요청·해제 메서드입니다.

```csharp
public void Hold(object owner)
{
    if (owner != null) holds.Add(owner);
}

public void Release(object owner)
{
    if (owner != null) holds.Remove(owner);
}
```

`Update()`는 종료 상태이거나 요청이 남아 있으면 진행하지 않습니다. 이 API는 **한 주체당 하나의 정지 요청**을 표현하므로, 요청 주체는 종료 경로에서 자신의 `Release`를 호출해야 합니다.

| 담당 모듈 | 책임 |
|---|---|
| `GameTime` | 근무 시계 진행과 주체별 Hold / Release |
| `GamePause` | 전체 일시정지 상태, `Time.timeScale`, `AudioListener.pause` 변경·복원 |
| `ViewmodelTime` | 손·태블릿에 사용할 시간 제공. 정지 중에는 0, 진행 중에는 `unscaledDeltaTime` |

손·태블릿에 `deltaTime`을 그대로 쓰면 감속 연출에 손까지 느려지고, `unscaledDeltaTime`만 쓰면 일시정지 중에도 움직입니다. 전용 시간축은 **감속과 정지를 구분**하고, 별도의 강제 정지·timeScale 무시 설정으로 연출 정책을 연결합니다.

### 구현 중 추가로 해결한 문제

<div class="ts-box" markdown="1">

`Time.timeScale = 0`만으로는 이미 재생 중인 태블릿 알람이 멈추지 않았습니다. `GamePause.Set()`에서 시간 배율과 `AudioListener.pause`를 함께 변경하도록 모았습니다.

복원 경로도 중요했습니다. 일시정지 상태에서 씬을 이동하면 다음 씬에도 무음·정지 상태가 남을 수 있어, 전환 시 `GamePause.Clear()`로 둘을 함께 복원했습니다. Domain Reload를 끈 에디터에서는 `SubsystemRegistration`으로 정적 일시정지 상태와 이벤트도 초기화합니다.

</div>

### 결과와 한계

근무 시계에서는 한 연출의 종료가 다른 요청을 해제하지 않도록 했고, 전체 일시정지는 시간과 소리의 복원을 한곳에서 관리하게 했습니다. 이후 시스템 담당 팀원이 이 구조를 연결해 **태블릿을 보는 동안에도 근무 시계는 흐르는 정책**을 적용했습니다. 요청을 처리하는 구조와 실제 플레이 규칙을 분리한 사례입니다.

주체별 요청 관리는 `GameTime`의 책임입니다. `GamePause`까지 다중 요청을 관리하는 구조는 아니며, 현재 전체 정지 해제는 `timeScale`을 1로 복원합니다.

**구현 코드:** [GameTime.cs][source-time] · [GamePause.cs][source-pause] · [ViewmodelTime.cs][source-viewmodel-time]

**팀 연동 코드:** [TabletBridge.cs — 시스템 담당의 태블릿 정책 연결][source-bridge]

<a id="animation-correction"></a>

## 03. 절차적 애니메이션 합성과 본 회전 누적 보정

**Animator 갱신 여부 · Quaternion · 원본 자세와 보정 결과 분리**

<div class="experience-summary" markdown="1">

**문제** · 애니메이션 증폭과 흔들림을 합성하자 본의 회전이 누적되며 자세가 무너졌습니다.

**해결** · 이전 출력이 다음 프레임의 원본으로 재사용되는 조건을 확인하고, 대상 본·합성 순서·보정 기준 자세를 함께 정리했습니다.

</div>

### 문제 상황

사람 나무 크리처의 애니메이션을 더 크게 움직이게 하고, 그 위에 절차적 흔들림을 합성했습니다. 그런데 두 효과를 함께 적용하자 자세가 점점 틀어지고 본이 크게 이탈했습니다. 의도한 공포 연출과 달리, 시간이 지날수록 모델의 자세 자체가 무너졌습니다.

### 원인 분석

Animator가 모든 본의 회전을 매 프레임 덮어쓴다고 가정하면, 현재 회전을 읽어 보정하는 방식은 자연스러워 보입니다. 하지만 클립에서 움직이지 않는 본이나 갱신이 생략된 본에서는 **이전 보정 결과가 Transform에 남아 있었습니다.**

```text
문제가 된 흐름
원래 자세 → 동작 증폭·흔들림 → 보정된 자세
                              ↓ 다음 프레임에 원본으로 다시 사용
                         재증폭 → 회전 누적

수정한 기준
이번 프레임의 회전이 내가 마지막으로 쓴 값인가?
  같음 → 저장한 원래 자세를 기준으로 보정
  다름 → 새로 입력된 자세를 기준으로 보정
```

### 해결 과정

보정값만 바꾸는 것으로 끝내지 않고, **어떤 본을 대상으로 어떤 순서로 계산할지**부터 정리했습니다.

- **에디터 전처리** — 클립을 샘플링해 실제로 움직이는 본과 평균 자세를 구했습니다. 쿼터니언은 같은 회전도 반대 부호로 표현할 수 있어, 같은 반구로 부호를 맞춘 뒤 평균을 계산했습니다.
- **동작 증폭** — `HorrorAnimAmplify`는 평균 자세(`reference`)와 현재 기준 자세 사이를 `Quaternion.SlerpUnclamped`로 외삽합니다. 평균 자세는 미리 전달받고, 런타임에는 클립을 다시 샘플링하지 않습니다.
- **적용 순서** — 증폭 컴포넌트에 실행 순서 `-50`을 지정해 `HorrorTreeSway`보다 먼저 처리하고, 키운 동작 위에 흔들림을 더합니다.

**보정 전 자세와 마지막 출력 분리**

두 컴포넌트는 각각 `lastBase`(보정 전 자세), `lastWritten`(마지막 출력), `written`(출력 이력)을 보관합니다. 현재 회전이 자신이 마지막으로 쓴 값과 같으면 저장한 원래 자세를 사용합니다.

아래는 `HorrorAnimAmplify.LateUpdate()`에서 발췌한 실제 코드입니다.

```csharp
Quaternion current = e.bone.localRotation;
Quaternion basePose = e.written && current == e.lastWritten ? e.lastBase : current;
// 평균 → 지금 자세의 차이를 strength배로(구면 외삽)
Quaternion result = Quaternion.SlerpUnclamped(e.reference, basePose, strength);
e.bone.localRotation = result;
e.lastBase = basePose;
e.lastWritten = result;
e.written = true;
```

`OnDisable()`에서도 자신의 마지막 출력이 남아 있는 경우에만 원래 자세로 복원합니다. 다른 처리에서 이미 회전을 바꿨다면 그 값을 덮어쓰지 않습니다.

### 결과와 한계

애니메이션 대상 본을 선별하고, 갱신이 생략된 본이 이전 보정 결과를 원본으로 다시 사용하지 않도록 했습니다. **“회전이 이상하다”는 증상에서, 프레임마다 누가 어떤 값을 쓰는지 추적한 디버깅 사례**입니다.

이 해결은 대상 본의 선별과 정해진 실행 순서를 함께 적용한 것입니다. 다른 회전 보정 컴포넌트를 추가할 때는 마지막 출력 비교만으로 구분되지 않는 경우가 있으므로, 본별 갱신 주체와 합성 순서를 다시 확인해야 합니다.

**구현 코드:** [HorrorAnimAmplify.cs][source-amplify] · [HorrorTreeSway.cs][source-sway]

<a id="rendering-effects"></a>

## 추가 렌더링·컷신 구현

<a id="screen-shader"></a>

### HLSL 기반 화면 왜곡·색수차

`ScreenWobble.shader`에서 주파수가 다른 사인·코사인 파형으로 화면 UV를 변위시키고, RGB 채널을 서로 다른 위치에서 샘플링해 색수차를 적용했습니다. 화면 중심보다 가장자리의 왜곡이 커지도록 중심으로부터의 거리를 가중치로 사용합니다.

여러 연출이 동시에 효과를 요청하면 `ScreenWobble`이 활성 소스의 **최대 강도**를 선택해 `Shader.SetGlobalFloat`로 전달합니다. 합산으로 효과가 과도해지는 대신 하나의 강도로 제어하며, 사용자 배율 `userScale`로 전체 효과를 조절합니다.

셰이더 내장 시간 대신 C#에서 `Time.deltaTime`으로 누적한 시간을 사용해 일시정지 시 왜곡도 멈추게 했습니다. 컴포넌트 비활성화 시에는 전역 강도를 0으로 초기화해 다음 씬에 효과가 남지 않도록 했습니다.

**구현 코드:** [ScreenWobble.shader — UV 왜곡·RGB 분리][source-wobble-shader] · [ScreenWobble.cs — 강도·시간 관리][source-wobble]

<a id="dynamic-mesh"></a>

### 사전 계산한 단면 데이터로 수면 메시 갱신

수위가 내려가면 용기 안쪽의 단면도 달라지므로, 수면을 평면 하나의 위치·스케일만으로 표현하기 어렵습니다. 에디터에서 준비한 **높이별·방향별 반지름 표**를 런타임에 보간해 수면의 외곽 정점을 갱신했습니다.

`ToiletFlush.BuildMesh()`는 중심 정점과 외곽 정점으로 삼각형 팬 형태의 Mesh를 만들고 `MarkDynamic()`을 설정합니다. 정점 배열과 삼각형 연결은 초기화할 때 준비하고, `SetLevel()`에서는 현재 수위에 인접한 두 높이의 반지름을 `Mathf.Lerp`로 보간합니다. 보간한 반지름으로 외곽 정점을 배치한 뒤 정점 데이터와 바운드를 갱신합니다.

형상 데이터를 미리 준비하는 단계와 재생 중 정점을 갱신하는 단계를 나눠, 수위 변화에 따라 용기 안쪽 형상을 따르는 수면을 구현했습니다.

**구현 코드:** [ToiletFlush.cs — BuildMesh / SetLevel][source-flush]

<a id="timeline-camera"></a>

### Timeline과 플레이어 카메라 연동

`DeathCutscene`은 Timeline이 움직이는 카메라 목표를 기존 플레이어 카메라가 따라가도록 구성했습니다. 진입 순간의 위치·회전을 저장하고, `LateUpdate()`에서 `Vector3.Lerp`와 `Quaternion.Slerp`로 목표 자세에 보간합니다. 전환 가중치는 `SmoothStep`으로 계산합니다.

기존 카메라를 사용해 플레이 중의 후처리·손전등 구성을 이어가고, `PlayableDirector`의 재생·정지와 카메라 제어를 연결했습니다. 주변 소리를 정지한 상태에서도 컷신 소리는 재생할 수 있도록 `AudioSource.ignoreListenerPause`를 사용했습니다.

**구현 코드:** [DeathCutscene.cs — 카메라 보간과 컷신 상태 관리][source-cutscene]

<a id="supporting-work"></a>

## 플레이를 완성하기 위한 보조 구현

핵심 사례 외에도 게임 시작부터 결과·엔딩까지의 흐름과 연출 제작·검증 도구를 담당했습니다.

<a id="sec-1"></a>
<details class="collapse-block" markdown="1">
<summary class="btn">게임 플로우 · 기본 플레이 <span class="chevron">▾</span></summary>

- **전체 흐름** — 메인 → 오프닝 → 계약서 → 로딩 → 근무 → 결과 → 다음 날 / 사망 / 엔딩. 무거운 Play 씬에 비동기 로딩을 적용했습니다.
- **로딩** — 씬 활성화 전 진행률과 최소 표시 시간을 함께 처리하고, ScriptableObject + CSV로 로딩 팁을 관리했습니다. 일차에 따라 팁을 해금하고, 씬 경로의 Build Settings 누락은 인스펙터에서 경고합니다.
- **입력·UI** — 1인칭 이동·시점, 태블릿 확대 시 감속, 조작 안내 HUD와 커서 관리. 계약서에는 드래그 사이를 보간하는 서명 패드를 적용했습니다.
- **결과 표현** — 위반한 수칙에 빨간 줄을 표시하는 근무 일지, 일차별 결과·사망 화면·엔딩 크레딧을 연결했습니다.

</details>

<a id="sec-3"></a>
<details class="collapse-block" markdown="1">
<summary class="btn">태블릿 · CSV 메시지 · 화면 글리치 <span class="chevron">▾</span></summary>

- **수칙·메시지 UI** — ScriptableObject의 수칙 데이터를 표시하고, 수신 시각·안 읽음 표시·반복 알람을 연결했습니다. 판정 수치와 상세 규칙은 노출하지 않습니다.
- **CSV 메시지 연출** — 이벤트 이름, 메시지 간격·본문·색, 반복 시간, 읽음 대기, 종료 동작을 데이터로 작성합니다. 코드·Timeline Signal·개발자 모드에서 같은 이벤트를 실행합니다.
- **1인칭 움직임** — `Mathf.SmoothDamp`를 이용한 들기·내리기, 호흡·시선 지연·걸음 흔들림과 절차적 손가락 움직임을 합성했습니다.
- **글리치** — 강도 하나로 셰이더와 TMP 글자 정점·문자 변형을 함께 조정합니다. 글리치 이후 새 내용이 옛 글자로 덮이던 문제는 **원본 복원 → 새 내용 쓰기** 순서로 수정했습니다.

</details>

<a id="sec-4"></a>
<a id="sec-5"></a>
<a id="sec-6"></a>
<details class="collapse-block" markdown="1">
<summary class="btn">공포 연출 · 사망 컷신 · 액체 효과 <span class="chevron">▾</span></summary>

- **연출 진입점 통합** — 구역 진입·응시·수치 구간 변화가 `HorrorEvent.Play()`로 연결됩니다. 시스템 담당자가 판정 시점에 같은 연출을 호출할 수 있도록 트리거와 표현을 분리했습니다.
- **되돌리기** — 플레이어가 안 보는 동안 Timeline을 `time = 0; Evaluate()`로 복원합니다. `Stop()`이 Activation 트랙의 Post-playback 상태를 적용하는 문제를 피했습니다.
- **화면 효과** — 질식·암전·위화감·스며듦 볼륨과 화면 일렁임. 여러 입력 중 최댓값을 Full Screen Pass에 전달하고, 일시정지에 맞춰 셰이더 시간을 누적했습니다.
- **사망 컷신** — 청각·조도 컷신은 최종 붙잡힘 연출로 적용했습니다. 플레이어 카메라를 Timeline 목표와 혼합해 기존 후처리·손전등을 이어가고, 컷신 소리에는 `ignoreListenerPause`를 적용했습니다.
- **프로토타입 구분** — 배치 축 컷신은 런타임 NavMesh와 경로 계산을 이용한 프로토타입입니다. 최종 게임에 사용한 청각·조도 컷신과 구분합니다.
- **액체 연출** — 물방울·핏물·수면 효과. 에디터에서 구운 높이·방향별 반지름 표로 수면 메시를 그릇에 맞추고, 물방울의 충돌 시점과 소리를 연결했습니다.

<video class="detail-img" src="{{ '/assets/img/instruction-liquid.mp4' | relative_url }}" controls preload="none" muted playsinline aria-label="액체 연출 시연"></video>

</details>

<a id="sec-7"></a>
<a id="sec-8"></a>
<details class="collapse-block" markdown="1">
<summary class="btn">개발자 모드 · 에디터 자동화 <span class="chevron">▾</span></summary>

- **상황을 바로 재현하는 패널** — 일차 변경·다시 시작·즉시 사망·배속·시각 이동·메시지 주입·CSV 이벤트 실행. 이후 시스템 파트가 판정·조우 탭을 추가해 팀 공용 도구로 확장했습니다.
- **개발용 빌드 분리** — 디버그 패널은 에디터·개발 빌드에서만 컴파일되도록 제한했습니다.
- **에디터 빌더** — 씬·프리팹·Timeline 생성 메뉴로 반복 세팅을 자동화하고, 프리팹 배리언트로 원본 에셋을 보존했습니다.
- **사운드 정렬** — WAV RIFF를 읽어 시작점·피크를 분석하고, 지정한 컷신 시각에 맞춰 Timeline의 `clipIn`을 조정했습니다. 압축 클립에서 `GetData`로 데이터를 얻지 못하던 상황은 원본 WAV를 읽는 방식으로 처리했습니다.

<video class="detail-img" src="{{ '/assets/img/instruction-devmode.mp4' | relative_url }}" controls preload="none" muted playsinline aria-label="개발자 모드 시연"></video>

</details>

<a id="development"></a>
<a id="sec-9"></a>

## 담당 범위와 개발 방식

### 시스템과 클라이언트의 경계

프로그래머 2명이 판정과 표현을 나눴습니다. **수칙 판정·수치·편성·조우 시점은 시스템 담당 팀원**, 저는 판정 결과를 화면·소리·게임 흐름으로 전달하는 클라이언트 영역을 맡았습니다.

시스템은 `EventBus`로 판정 결과를 알리고, 클라이언트는 이를 받아 연출합니다. 태블릿 글리치·공포 연출·근무 시계 정지처럼 시스템에서 필요한 기능은 공개 API로 연결했습니다. 파트별 파일 수정 범위를 나누고, 기능 사용 가이드를 공유했습니다.

### AI 활용과 본인 역할

프로그램의 개발 방식에 맞춰 **대부분의 코드는 Claude Code를 활용해 작성**했습니다. 저는 요구사항을 정리하고, Unity에서 결과를 직접 플레이하며 타이밍·밝기·소리를 조율했습니다. 버그의 재현 조건을 정리해 원인을 함께 추적하고, 수정 결과와 팀 시스템의 연결을 확인했습니다.

Unity CLI로 에디터·콘솔·테스트 결과를 확인하는 흐름을 연결하고, 결정 사항·변경 내용·검증 기록을 남겼습니다. 위 사례는 이 협업 과정에서 다룬 기술적 문제와 구현 근거를 설명합니다.

### 형상관리와 팀 작업

저장소·Git LFS 설정, 씬·프리팹 잠금 규칙, 파트별 브랜치 운영과 형상관리 매뉴얼을 담당했습니다. 대용량 외부 에셋은 팀 드라이브로 같은 버전을 공유하고, 씬 작업 전 잠금 확인부터 병합·잠금 해제까지 작업 절차를 맞췄습니다.

<div class="card-links" style="margin-top: 32px;">
  <a class="btn btn-primary" href="{{ '/' | relative_url }}#instruction">← 프로젝트 목록으로</a>
  <a class="btn" href="https://github.com/KimJinsun610/NCAI_BrokenCompass" target="_blank" rel="noopener noreferrer">전체 코드 보기</a>
</div>

<nav class="floating-toc" id="floatingToc" aria-label="Instruction 상세 목차">
  <p class="ftoc-title">문제 해결 사례</p>
  <ol>
    <li><a href="#render-isolation">렌더링·조명 분리</a></li>
    <li><a href="#time-control">시간 제어</a></li>
    <li><a href="#animation-correction">본 회전 보정</a></li>
    <li><a href="#rendering-effects">셰이더·메시·컷신</a></li>
    <li><a href="#supporting-work">보조 구현</a></li>
    <li><a href="#development">담당 범위·개발 방식</a></li>
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

[source-wobble-shader]: https://github.com/KimJinsun610/NCAI_BrokenCompass/blob/0a40cbc77a272a2ab25997793d784880020cd290/horror%20house/Assets/3.2%20Programmer_Kim/04%20Materials/ScreenWobble/ScreenWobble.shader
[source-wobble]: https://github.com/KimJinsun610/NCAI_BrokenCompass/blob/0a40cbc77a272a2ab25997793d784880020cd290/horror%20house/Assets/3.2%20Programmer_Kim/02%20Scripts/HorrorEvent/ScreenWobble.cs
[source-flush]: https://github.com/KimJinsun610/NCAI_BrokenCompass/blob/0a40cbc77a272a2ab25997793d784880020cd290/horror%20house/Assets/3.2%20Programmer_Kim/02%20Scripts/Liquid/ToiletFlush.cs
[source-cutscene]: https://github.com/KimJinsun610/NCAI_BrokenCompass/blob/0a40cbc77a272a2ab25997793d784880020cd290/horror%20house/Assets/3.2%20Programmer_Kim/02%20Scripts/HorrorEvent/DeathCutscene.cs
[source-rig]: https://github.com/KimJinsun610/NCAI_BrokenCompass/blob/0a40cbc77a272a2ab25997793d784880020cd290/horror%20house/Assets/3.2%20Programmer_Kim/02%20Scripts/Tablet/ViewmodelRig.cs
[source-time]: https://github.com/KimJinsun610/NCAI_BrokenCompass/blob/0a40cbc77a272a2ab25997793d784880020cd290/horror%20house/Assets/3.2%20Programmer_Kim/02%20Scripts/GameFlow/GameTime.cs
[source-pause]: https://github.com/KimJinsun610/NCAI_BrokenCompass/blob/0a40cbc77a272a2ab25997793d784880020cd290/horror%20house/Assets/3.2%20Programmer_Kim/02%20Scripts/GameFlow/GamePause.cs
[source-viewmodel-time]: https://github.com/KimJinsun610/NCAI_BrokenCompass/blob/0a40cbc77a272a2ab25997793d784880020cd290/horror%20house/Assets/3.2%20Programmer_Kim/02%20Scripts/Tablet/ViewmodelTime.cs
[source-bridge]: https://github.com/KimJinsun610/NCAI_BrokenCompass/blob/0a40cbc77a272a2ab25997793d784880020cd290/horror%20house/Assets/_Game/Flow/TabletBridge.cs
[source-amplify]: https://github.com/KimJinsun610/NCAI_BrokenCompass/blob/0a40cbc77a272a2ab25997793d784880020cd290/horror%20house/Assets/3.2%20Programmer_Kim/02%20Scripts/HorrorEvent/HorrorAnimAmplify.cs
[source-sway]: https://github.com/KimJinsun610/NCAI_BrokenCompass/blob/0a40cbc77a272a2ab25997793d784880020cd290/horror%20house/Assets/3.2%20Programmer_Kim/02%20Scripts/HorrorEvent/HorrorTreeSway.cs
