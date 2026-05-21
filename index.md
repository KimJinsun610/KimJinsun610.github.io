---
layout: home
title: 즐거움으로 성장하는 개발자
---

# 김진선

**Game Client Developer**

📞 010-7533-0933 · 📧 happyjjinsun@naver.com · 🎂 2002.06.10  
[![GitHub](https://img.shields.io/badge/GitHub-KimJinsun610-181717?style=flat&logo=github&logoColor=white)](https://github.com/KimJinsun610)

---
👾
안녕하세요. 즐거움을 원동력으로 성장하는 개발자 김진선 입니다.
좋아하는 일에 열중 하는 것만큼, 개발 과정 자체를 즐길 수 있는 개발자가 되고자 합니다.
하지만 혼자만 즐거운 개발자는 좋은 개발자가 아니라고 생각합니다.
함께 즐거움을 느끼고, 팀과 성과를 나누며, 문제를 해결해 성취를 만들어가는 개발자가 진정한 개발자라 믿습니다.
저는 그런 개발자가 되기 위해 오늘도 한 걸음씩 나아가고 있습니다.

---

## 🎓 학력

- **한국공학대학교** 게임공학과 학사 졸업 (2021.03 ~ 2025.02)
- 동우여자고등학교 인문계 졸업 (2021.02)

---

## 🛠 기술 스택

- **Language** : C / C++, Python, HLSL
- **API** : OpenGL, DirectX 12, Win API
- **Engine** : Unreal 5, Unity
- **Dev Tool** : Git, Notion, Photoshop

---

## 🎮 프로젝트

---

### 🔷 CyberZ

> DirectX 12 / IOCP 기반 3인 협동 멀티플레이 게임 \| 졸업작품

- **기간** : 2023.08 ~ 2024.07
- **인원** : 3명 (클라이언트 2, 서버 1)
- **언어** : C, C++, HLSL
- **환경** : DirectX 12, Direct2D, IOCP

**게임 목표**
3명의 플레이어가 협동하여 적대 NPC를 피해 총 2라운드의 해킹 미션을 수행

**담당 및 주요 구현**
- DirectX 12 기반 게임 프레임워크 설계 (Scene / Camera / Shader / UI 구조)
- Scene 단위 GPU 리소스 관리 (Upload Heap → Default Heap 전송 후 즉시 해제)
- AABB 기반 충돌 처리 — 서버 위치 보정 + 클라이언트 충돌 연산 분리
- Direct2D + 11on12 활용한 2D UI 오버레이 시스템 (CButton / CTextInput / CProgressBar)
- 디퍼드 렌더링, 그림자, 스키닝 애니메이션, HLSL 셰이더 프로그래밍

[![GitHub](https://img.shields.io/badge/GitHub-소스코드-181717?style=flat&logo=github&logoColor=white)](https://github.com/KimJinsun610/CyberZ)
[![YouTube](https://img.shields.io/badge/YouTube-플레이영상-FF0000?style=flat&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=1F4cTjuyq-g)
[![Notion](https://img.shields.io/badge/Notion-상세문서-000000?style=flat&logo=notion&logoColor=white)](https://www.notion.so/CyberZ-Model-export-import-1fdeaebf4a0d803e8249d3bbcd2739e3)

---

### 🟩 Tank Shoot

> OpenGL / TCP 기반 네트워크 2인 대전 게임 \| 팀 프로젝트

- **기간** : 2023.11 ~ 2023.12 (2개월)
- **인원** : 3명
- **언어** : C, C++
- **환경** : OpenGL, TCP

**게임 목표**
아이템을 사용하며 상대방을 공격하여 HP를 0으로 만들면 승리

**담당 및 주요 구현**
- OpenGL 기반 클라이언트 개발 전반 (오브젝트, 카메라, 아이템 시스템)
- 3스레드 서버 구조 설계 (Main / ClientThread / do_send) — 입력과 동기화 분리
- Fine-Grained Locking 으로 동시성 최적화 (상황별 락 세분화, lock_guard 데드락 방지)
- 충돌 연산을 서버에서 처리 후 전체 클라이언트에 브로드캐스트하는 권위 서버 방식

[![GitHub](https://img.shields.io/badge/GitHub-소스코드-181717?style=flat&logo=github&logoColor=white)](https://github.com/KimJinsun610/NetworkGPTerm)

---

### 🟣 Project BBB *(개발 중)*

> Unreal 5 기반 1인 액션 게임 \| 개인 프로젝트

- **기간** : 2026.02 ~ 진행 중
- **인원** : 1인
- **언어** : C++
- **환경** : Unreal 5.4

**게임 목표**
원거리 공격(디버프)과 근거리 공격(데미지)을 적절히 사용하여 몬스터 처치

**주요 구현**
- 캐릭터 계층 구조 : `ACharacterBase` → Player / EnemyMelee / EnemyRange
- 무기 추상화 (`PURE_VIRTUAL`) : `WeaponBase`의 `Attack()` / `StopAttack()` — Base 수정 없이 확장
- AI Controller와 Enemy 클래스의 느슨한 결합 — 적 추가 시 Controller 수정 불필요
- `UDebuffComponent` : TickComponent 기반 디버프 자동 만료 + 델리게이트 기반 UI 자동 반영
- 원거리 n번 명중 → 디버프 발동 → 근거리 처치 가능한 전략적 교전 루프

[![GitHub](https://img.shields.io/badge/GitHub-소스코드-181717?style=flat&logo=github&logoColor=white)](https://github.com/KimJinsun610/Project_BBB)
[![YouTube](https://img.shields.io/badge/YouTube-플레이영상-FF0000?style=flat&logo=youtube&logoColor=white)](https://youtu.be/-PDFx8YqYMc)
[![Notion](https://img.shields.io/badge/Notion-개발일지-000000?style=flat&logo=notion&logoColor=white)](https://www.notion.so/UNREAL-2eaeaebf4a0d8040ba38c7a177fde2be)
