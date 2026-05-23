---
layout: page
title: Project BBB
permalink: /projects/project-bbb/
---

> Unreal 5 기반 1인 액션 게임 | 개인 프로젝트 (개발 중)

<div class="card-links">
  <a class="btn" href="https://github.com/KimJinsun610/Project_BBB" target="_blank">GitHub</a>
  <a class="btn" href="https://youtu.be/-PDFx8YqYMc" target="_blank">YouTube</a>
  <a class="btn" href="https://www.notion.so/UNREAL-2eaeaebf4a0d8040ba38c7a177fde2be" target="_blank">개발 일지(Notion)</a>
</div>

---

## 개요

| 항목 | 내용 |
|------|------|
| 개발 언어 | C++ |
| 개발 환경 | Visual Studio 2022, Unreal 5.4, GitHub |
| 개발 인원 | 1인 |
| 개발 기간 | 2026.02 ~ 진행 중 |

**게임 목표** : 원거리 공격(디버프)과 근거리 공격(데미지)을 적절히 사용하여 몬스터 처치

---

## 현재 구현 항목

- [x] 무기 계층 구조
- [x] 플레이어 조작
- [x] 근/원거리 공격 시스템
- [x] 근/원거리 AI
- [x] 아이템 드롭
- [x] UI
- [ ] 추가 구현 예정 (진척도에 따라)

---

## 클래스 계층 구조

```
AActor
└── ACharacterBase         ← 무기 장착/교환, 피격 처리, 공통 메쉬
    ├── ACharacterPlayer   ← 1인칭 & 숄더뷰, 입력/이동, 무기 변경/조준/공격
    └── AEnemyBase         ← 근/원거리 적 AI, 아이템(재화) 드롭
        ├── AEnemyMelee
        └── AEnemyRange

AActor
└── AWeaponBase            ← Attack() / StopAttack() 순수 가상함수
    ├── AWeaponMelee       ← 콤보 어택
    └── AWeaponRange       ← 원거리 총알 (AProjectileBase)

UActorComponent
├── UStatComponent         ← HP, 사망, 데미지
└── UDebuffComponent       ← 디버프 적용/만료/카운트 관리
```

---

## 설계 포인트

### 상속 설계
- `ACharacterBase`가 플레이어와 적의 공통 로직(무기 장착, 피격 처리, 메쉬 등)을 담당
- 상속 관계로 캐릭터 추가 등의 **확장에 용이**하도록 설계

### AI 인터페이스
- AI Controller와 Enemy 클래스를 **느슨하게 결합** → 적 추가 시 Controller 수정 불필요

### 무기 추상화 (PURE_VIRTUAL)
- `WeaponBase`에서 `Attack()` / `StopAttack()`을 순수 가상함수로 선언
- 무기 종류에 따라 **Base 수정 없이 확장 가능**
- 근거리와 원거리 무기를 각각 독립적으로 구현

---

## 디버프 시스템

### 전략적 교전 루프

```
원거리 공격 (n번 명중)
    → ProjectileDebuff 발사
    → OnProjectileHit()
    → DebuffComponent.ApplyDebuff()
    → OnDebuffApplied 델리게이트 발생
        → Enemy UI 업데이트 (방패 아이콘)
        → AI BehaviorTree 행동 변화 (공격/이동 불가)
    → 디버프 상태에서 근거리 공격으로 처치 가능
```

- 원거리 n번 명중 시 디버프 발동 → 근거리 공격 가능한 구조
- 디버프 해제 시 카운트 초기화 → 다시 n번 공격 필요
- **단순 공격이 아닌 전략적 교전** 유도

### TickComponent 기반 자동 만료

- 별도 타이머 핸들 없이 Tick에서 `DebuffTimers`를 순회하여 만료 처리
- `RemoveDebuff()`가 `RemoveDebuffEffect()` + 카운트 리셋을 함께 처리

### 델리게이트 기반 UI 연동

- 델리게이트 기반 **느슨한 결합**으로 상태 변화 시 머리 위 위젯에 자동 반영
- 디버프 카운트를 방패 UI로 시각화

<div class="card-links" style="margin-top:40px;">
  <a class="btn btn-primary" href="/">← 목록으로</a>
</div>