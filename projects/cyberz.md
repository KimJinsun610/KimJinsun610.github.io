---
layout: page
title: CyberZ
permalink: /projects/cyberz/
---

> DirectX 12 기반 3인 협동 멀티플레이 해킹 미션 게임 | 졸업작품

<div class="card-links">
  <a class="btn" href="https://github.com/KimJinsun610/CyberZ" target="_blank">GitHub</a>
  <a class="btn" href="https://www.youtube.com/watch?v=1F4cTjuyq-g" target="_blank">YouTube</a>
  <a class="btn" href="https://www.notion.so/CyberZ-369eaebf4a0d803cb713d0058532b93d?source=copy_link" target="_blank">개발 일지(Notion)</a>
</div>

---

## 개요

| 항목 | 내용 |
|------|------|
| 개발 언어 | C, C++, HLSL |
| 개발 환경 | Visual Studio 2022, DirectX 12, DirectX 2D, IOCP, GitHub |
| 개발 인원 | 3명 (클라이언트 2, 서버 1) |
| 개발 기간 | 2023.08 ~ 2024.07 |
| 담당 역할 | 클라이언트 개발 |

**게임 목표** : 3명의 플레이어가 협동하여 적대 NPC를 피해 총 2라운드의 해킹 미션을 수행

---

## 담당 구현 항목

- 그림자 / UI / 미션 구성 / 오브젝트 로드 / 씬 구성
- 디퍼드 렌더링 / 플레이어 조작 및 카메라
- 리소스 관리 / 쉐이더 프로그래밍

---

## 클라이언트 프레임워크 구조

```
CyberZ_Client
├── Game          ← 게임 루프, Direct3D 12 초기화, Scene 관리, GPU 동기화
├── Camera        ← 뷰/프로젝션 행렬, 플레이어 추적, 프러스텀 컬링
├── Scene         ← 씬 단위 리소스·오브젝트·조명·셰이더 관리
├── Object        ← Texture / Material 정의, 바이너리 리소스 로드
│   ├── Mesh      ← 기본 메쉬, 바이너리 리소스 파싱
│   └── Animation ← 스키닝 애니메이션, 애니메이션 블렌딩
├── Shader        ← HLSL 컴파일/로딩, PSO 생성, 그림자 연산
└── UI            ← Direct2D 기반 오버레이, 텍스트·이미지 렌더링
```

---

## 기술 구현 상세

### 오브젝트 리소스 로드

- Unity Asset Store에서 구매한 모델을 C# 스크립트로 `.bin` 파일 추출 후 프로젝트에서 로드
- 상호작용 없는 오브젝트들을 **하나의 메쉬로 병합** 추출하여 메모리 사용량 감소
- Albedo, Normal, Metallic, Emission 등 셰이더 정보를 포함하여 추출, 로드 시 자동 적용

### Scene 기반 리소스 관리

```
게임 실행  →  Scene Load  →  CPU▶GPU 데이터 전송  →  Upload 버퍼 즉시 해제
                                                       ↓
                                              Scene Unload → 전체 리소스 해제
                                              (Shader → Object → Upload Buffer 순서)
```

- DirectX 12 메모리 계층 구조(Upload Heap / Default Heap) 이해 기반 설계
- Scene 단위 독립 리소스 관리 → Scene 전환 시 메모리 누수 방지
- GPU 종속성을 고려한 **계층적 해제 순서** 적용

### 충돌 처리

- 플레이어 / 일반 오브젝트 / 미션 오브젝트 충돌을 구별하여 처리
- **AABB 기반** `CheckFaceIntersection()` 구현 — 충돌 면의 법선 벡터 방향 반환
- 플레이어 간 충돌 제외, 오브젝트-플레이어 / 오브젝트-NPC 충돌 분리
- 서버에서 각 플레이어 위치를 받아 **각 클라이언트에서 충돌 연산** + 서버 주기적 보정
- 디버그용 컬러 바운딩 박스 메쉬 (빨강: 고정 객체 / 초록: 이동 객체 / 파랑: 미션 구역)

### UI 시스템

- Scene별 전용 UI 인스턴스 소유 — Scene 전환 시 UI 메모리 함께 해제
- **Direct2D + 11on12 Device** 활용 → DirectX 12 위에 2D UI 오버레이
- `RenderUIElements()`에서 UI 객체 동적 생성

| 컴포넌트 | 기능 |
|---------|------|
| `CButton` | 클릭 감지, 상태별 색상 변경 |
| `CTextInput` | 키보드 입력 처리, 문자열 편집 |
| `CProgressBar` | 진행도 시각화, 동적 업데이트 |
| `CTagButton` | 호버 감지, 2라운드 미니게임용 |

<div class="card-links" style="margin-top:40px;">
  <a class="btn btn-primary" href="/">← 목록으로</a>
</div>