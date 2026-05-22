---
layout: home
title: 즐거움으로 성장하는 개발자
---

# 김진선  
### Game Client Developer

📞 010-7533-0933 · 📧 happyjjinsun@naver.com · 🎂 2002.06.10  
[![GitHub](https://img.shields.io/badge/GitHub-KimJinsun610-181717?style=flat&logo=github&logoColor=white)](https://github.com/KimJinsun610)

---

## 👾 About Me

안녕하세요.  
즐거움을 원동력으로 성장하는 게임 클라이언트 개발자 김진선입니다.

저는 개발을 단순히 기능을 구현하는 작업이 아니라,  
문제를 해결하고 더 나은 경험을 만들어가는 과정이라고 생각합니다.

좋아하는 일에 깊게 몰입할 때 가장 빠르게 성장할 수 있다고 믿으며,  
개발 과정 자체를 즐기는 개발자가 되기 위해 꾸준히 배우고 도전하고 있습니다.

또한 좋은 개발은 혼자만의 만족으로 완성되지 않는다고 생각합니다.  
함께 고민하고, 함께 문제를 해결하며, 팀과 성취를 나눌 수 있을 때  
비로소 더 좋은 결과를 만들 수 있다고 믿습니다.

저는 오늘도 사람들과 함께 성장하며,  
즐거움과 성취를 만들어가는 개발자가 되기 위해 나아가고 있습니다.

---

## 🎓 Education

| 기간 | 내용 |
|---|---|
| 2021.03 ~ 2025.02 | 한국공학대학교 게임공학과 학사 |
| ~ 2021.02 | 동우여자고등학교 인문계 졸업 |

---

## 🛠 Tech Stack

### Language
`C` · `C++` · `Python` · `HLSL`

### Graphics / API
`DirectX 12` · `OpenGL` · `WinAPI`

### Engine
`Unreal Engine 5` · `Unity`

### Tools
`Git` · `Notion` · `Photoshop`

---

# 🎮 Projects

---

## 🟣 Project BBB *(In Progress)*

> Unreal Engine 5 기반 1인 액션 게임  
> **Personal Project**

### 📌 Overview

- **기간** : 2026.02 ~ 진행 중
- **인원** : 1인 개발
- **언어** : C++
- **환경** : Unreal Engine 5.4

### 🎯 게임 목표

원거리 공격으로 디버프를 누적시키고,  
근거리 공격으로 마무리하는 전략적인 전투 경험 구현

### ⚙ 주요 구현

- `ACharacterBase` 기반 플레이어/적 캐릭터 계층 구조 설계
- `PURE_VIRTUAL` 기반 무기 추상화 (`Attack()`, `StopAttack()`)
- AI Controller와 Enemy 클래스의 느슨한 결합 구조 설계
- `UDebuffComponent`
  - Tick 기반 자동 만료 처리
  - Delegate 기반 UI 자동 갱신
- 디버프 누적 → 근거리 마무리 구조의 전투 루프 구현

### 🔗 Links

[![GitHub](https://img.shields.io/badge/GitHub-Source_Code-181717?style=flat&logo=github&logoColor=white)](https://github.com/KimJinsun610/Project_BBB)
[![YouTube](https://img.shields.io/badge/YouTube-Gameplay-FF0000?style=flat&logo=youtube&logoColor=white)](https://youtu.be/-PDFx8YqYMc)
[![Notion](https://img.shields.io/badge/Notion-DevLog-000000?style=flat&logo=notion&logoColor=white)](https://www.notion.so/UNREAL-2eaeaebf4a0d8040ba38c7a177fde2be)
[![Detail](https://img.shields.io/badge/Detail-📄-4A90D9?style=flat)](projects/project-bbb)

---

## 🔷 CyberZ

> DirectX 12 / IOCP 기반 3인 협동 멀티플레이 게임  
> **Graduation Project**

### 📌 Overview

- **기간** : 2023.08 ~ 2024.07
- **인원** : 3명  
  - 클라이언트 2명
  - 서버 1명
- **언어** : C, C++, HLSL
- **환경** : DirectX 12, Direct2D, IOCP

### 🎯 게임 목표

3명의 플레이어가 협동하여 적대 NPC를 피해  
2개의 해킹 미션을 수행하는 협동 플레이 게임

### ⚙ 담당 및 주요 구현

- DirectX 12 기반 게임 프레임워크 설계
  - Scene
  - Camera
  - Shader
  - UI 구조 설계
- Scene 단위 GPU 리소스 관리
  - Upload Heap → Default Heap 전송 후 즉시 해제
- AABB 충돌 처리 및 서버 위치 보정 구조 구현
- Direct2D + 11on12 기반 UI 오버레이 시스템 구현
  - `CButton`
  - `CTextInput`
  - `CProgressBar`
- 디퍼드 렌더링
- 그림자 처리
- 스키닝 애니메이션
- HLSL 셰이더 프로그래밍

### 🔗 Links

[![GitHub](https://img.shields.io/badge/GitHub-Source_Code-181717?style=flat&logo=github&logoColor=white)](https://github.com/KimJinsun610/CyberZ)
[![YouTube](https://img.shields.io/badge/YouTube-Gameplay-FF0000?style=flat&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=1F4cTjuyq-g)
[![Notion](https://img.shields.io/badge/Notion-Documentation-000000?style=flat&logo=notion&logoColor=white)](https://www.notion.so/CyberZ-Model-export-import-1fdeaebf4a0d803e8249d3bbcd2739e3)
[![Detail](https://img.shields.io/badge/Detail-📄-4A90D9?style=flat)](projects/cyberz)

---

## 🟩 Tank Shoot

> OpenGL / TCP 기반 2인 네트워크 대전 게임  
> **Team Project**

### 📌 Overview

- **기간** : 2023.11 ~ 2023.12
- **인원** : 3명
- **언어** : C, C++
- **환경** : OpenGL, TCP

### 🎯 게임 목표

아이템을 활용하며 상대 플레이어를 공격하고  
상대 HP를 먼저 0으로 만들면 승리

### ⚙ 담당 및 주요 구현

- OpenGL 기반 클라이언트 개발 전반 담당
  - 오브젝트
  - 카메라
  - 아이템 시스템 구현
- 3-Thread 서버 구조 설계
  - Main
  - ClientThread
  - do_send
- Fine-Grained Locking 기반 동시성 최적화
- 서버 권위 방식 충돌 처리 및 동기화 구현

### 🔗 Links

[![GitHub](https://img.shields.io/badge/GitHub-Source_Code-181717?style=flat&logo=github&logoColor=white)](https://github.com/KimJinsun610/NetworkGPTerm)
[![Detail](https://img.shields.io/badge/Detail-📄-4A90D9?style=flat)](projects/tank-shoot)
```
