## 🎮 Projects

---

### CyberZ
> DirectX 12 기반 3인 협동 멀티플레이 게임 | 졸업작품

| 항목 | 내용 |
|------|------|
| 언어 | C, C++, HLSL |
| 환경 | DirectX 12, IOCP, Win API |
| 인원 | 3명 (클라이언트 2, 서버 1) |
| 기간 | 2023.08 ~ 2024.07 |

**주요 구현**
- DirectX 12 기반 게임 프레임워크 설계 (Scene, Camera, Shader, UI)
- 디퍼드 렌더링, 그림자, 스키닝 애니메이션 구현
- Scene 단위 GPU 리소스 관리 (Upload/Default Heap 분리)
- AABB 기반 충돌 처리 및 IOCP 멀티플레이 연동

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/KimJinsun610/CyberZ)
[![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=flat&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=1F4cTjuyq-g)

---

### Tank Shoot
> OpenGL / TCP 기반 네트워크 대전 게임 | 팀 프로젝트

| 항목 | 내용 |
|------|------|
| 언어 | C, C++ |
| 환경 | OpenGL, TCP |
| 인원 | 3명 |
| 기간 | 2023.11 ~ 2023.12 |

**주요 구현**
- OpenGL 클라이언트 개발 전반 (오브젝트, 카메라, 아이템 시스템)
- 3스레드 구조 서버 설계 (Main, ClientThread, do_send)
- Fine-Grained Locking으로 동시성 최적화
- 충돌 연산 서버 위임 + 클라이언트 보정 방식

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/KimJinsun610/NetworkGPTerm)

---

### Project BBB (개발 중)
> Unreal 5 기반 1인 액션 게임 | 개인 프로젝트

| 항목 | 내용 |
|------|------|
| 언어 | C++ |
| 환경 | Unreal 5.4 |
| 인원 | 1인 |
| 기간 | 2026.02 ~ 진행 중 |

**주요 구현**
- 캐릭터 계층 구조 설계 (CharacterBase → Player / EnemyMelee / EnemyRange)
- 무기 추상화 (PURE_VIRTUAL): WeaponBase의 Attack()/StopAttack()
- 디버프 컴포넌트 + 델리게이트 기반 느슨한 결합
- 원거리 디버프 → 근거리 처치 전략 루프 구현

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/KimJinsun610/Project_BBB)
[![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=flat&logo=youtube&logoColor=white)](https://youtu.be/-PDFx8YqYMc)