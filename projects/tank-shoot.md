---
layout: page
title: Tank Shoot
permalink: /projects/tank-shoot/
---

# Tank Shoot

> OpenGL / TCP 기반 네트워크 2인 대전 게임 | 팀 프로젝트

[![GitHub](https://img.shields.io/badge/GitHub-NetworkGPTerm-181717?style=flat&logo=github&logoColor=white)](https://github.com/KimJinsun610/NetworkGPTerm)

---

## 개요

| 항목 | 내용 |
|------|------|
| 개발 언어 | C, C++ |
| 개발 환경 | Visual Studio 2022, OpenGL, TCP, GitHub |
| 개발 인원 | 3명 |
| 개발 기간 | 2023.11 ~ 2023.12 (2개월) |
| 담당 역할 | 클라이언트 + 서버 공동 개발 |

**게임 목표** : 아이템을 사용하며 상대방을 공격, HP를 0으로 만들면 승리

---

## 담당 구현 항목

**클라이언트**
- OpenGL 기반 클라이언트 개발 전반 (오브젝트 로드, 맵 구성, 플레이어, 카메라, 아이템 시스템)

**서버**
- 아이템 세팅 및 상호작용 처리
- 충돌 처리 연산 및 충돌 정보 처리

---

## 서버 구조

```
Main Thread       ← 로그인/레디, Recv + 패킷 처리
ClientThread 1/2  ← 입력 처리 (클라이언트별 독립)
do_send Thread    ← 33Hz 상태 브로드캐스트
```

- 입력 처리(`ClientThread`)와 상태 동기화(`do_send`)를 **분리**하여 입력 지연 최소화
- 스레드: 3종 (Main, ClientThread × 2, do_send)
- 패킷: CS 9개 + SC 14개 = **총 23개**

---

## 기술 구현 상세

### Fine-Grained Locking

플레이어 배열이 전역으로 관리되어 2개의 스레드에서 동시 접근 → 락을 세분화하여 동시성 최적화

| 상황 | 락 전략 |
|------|---------|
| 로그인 | `g_Recvmutex_login` 사용 |
| 이동 | Critical Section으로 보호 |
| 공격 | 탄환 배열 + 브로드캐스트 보호, `lock_guard`로 데드락 방지 |
| 아이템 | 아이템별 짧은 락 획득 후 즉시 해제 |
| do_send | 읽기는 락 없이, 전송 시에만 `g_Sendmutex` 획득 |

다른 플레이어가 행동 중에도 패킷 처리가 가능하도록 구현

### Session Class (서버 측)

- 네트워크 세션과 플레이어 상태를 함께 관리
- `private` 멤버 + Getter/Setter로 **캡슐화**
- 한 플레이어의 모든 정보를 단일 클래스에서 처리 (**높은 응집도**)

### 충돌 검증 패턴

```
CS_MOVE_PACKET { direction, bodyYaw }  →  Server: 충돌 계산 후 이동 처리
                                        →  CS_UPDATE_PACKET  →  전체 클라이언트
```

서버에서 충돌 연산을 수행하고 결과를 브로드캐스트하는 **권위 서버(Authoritative Server)** 방식