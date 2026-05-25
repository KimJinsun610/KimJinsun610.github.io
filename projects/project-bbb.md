---
layout: page
title: Project BBB
permalink: /projects/project-bbb/
---

> Unreal Engine 5 기반 1인 액션 게임 | 개인 프로젝트 (개발 중)

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
| 개발 환경 | Visual Studio 2022, Unreal Engine 5.4, GitHub |
| 개발 인원 | 1인 |
| 개발 기간 | 2026.02 ~ 진행 중 |

**게임 목표** : 원거리 공격(디버프)으로 적을 약화시킨 뒤 근거리 공격으로 처치

---

## 클래스 계층 구조

```
AActor
└── ABBBCharacterBase          ← 무기 장착/교환, StatComponent, DebuffComponent
    ├── ABBBCharacterPlayer    ← 입력/이동, 조준, 무기 전환, 인벤토리
    └── ABBBEnemyBase          ← AI, 아이템 드롭, 사망 처리
        ├── ABBBEnemyMelee
        └── ABBBEnemyRange

AActor
└── ABBBWeaponBase             ← Attack() / StopAttack() 순수 가상 함수
    ├── ABBBWeaponMelee        ← HitBox 기반 콤보 공격
    └── ABBBWeaponRanged       ← 디버프 발사체 스폰, 쿨다운 관리

UActorComponent
├── UBBBStatComponent          ← HP, 데미지, 사망
├── UBBBDebuffComponent        ← 디버프 적용/만료/UI 연동
└── UBBBInventoryComponent     ← 아이템 보관/사용
```

---

## 구현 상세

### 1. 캐릭터 계층 구조 (CharacterBase 공통화)

`ABBBCharacterBase`가 플레이어와 적의 공통 로직을 담당한다.

- `StatComponent`, `DebuffComponent` 부착 — 플레이어/적 모두 동일한 피격·사망 처리
- 무기 장착/교환 로직을 Base에서 통합 — Player, Enemy 모두 재사용
- 새 캐릭터 추가 시 `CharacterBase` 상속만으로 기반 기능 자동 확보

---

### 2. WeaponBase 추상화 — Base 수정 없이 원거리/근거리 무기 독립 확장

`Attack()` / `StopAttack()`을 순수 가상 함수로 선언하여 무기 종류별 독립 구현

```
WeaponBase::Attack()   ← PURE_VIRTUAL
   ├── WeaponMelee     : HitBox 활성화, 콤보 애니메이션 재생
   └── WeaponRanged    : ProjectileDebuff 스폰, 발사 쿨다운 관리
```

- 캐릭터는 `CurrentWeapon->Attack()` 한 줄만 호출 — 무기 종류를 직접 알 필요 없음
- V키 전환 시 `Equip()` / `Unequip()`으로 무기 교체, WeaponBase 코드 수정 불필요

---

### 3. 전략적 전투 루프 — 디버프 누적 → 근거리 마무리

원거리 공격은 데미지가 없는 대신 디버프를 부여, 디버프 상태에서 근거리 마무리

```
원거리 모드 (기본)
  → 발사체 명중 → DebuffComponent.ApplyDebuff()
  → 디버프 적용 (Stun / Slow / Weaken)
  → 적 행동 약화
       ↓
V키 전환 → 근거리 모드
  → 디버프 상태 적에게 높은 데미지
  → Weaken 상태 시 받는 데미지 50% 추가
```

- 원거리만으로는 처치 불가 → 디버프 누적 후 접근하는 플레이 유도
- 디버프 만료 시 카운트 초기화 → 타이밍 관리가 전략 요소로 작용

---

### 4. TMap 기반 멀티 디버프 컴포넌트 — Tick 자동 만료 + Delegate UI 자동 갱신

여러 디버프가 독립적으로 동작하도록 TMap 구조로 설계

```cpp
TMap<EDebuffType, FDebuffData> ActiveDebuffs;  // 활성 디버프 데이터
TMap<EDebuffType, float>       DebuffTimers;   // 디버프별 남은 시간
```

**Tick 자동 만료**

별도 TimerHandle 없이 `TickComponent`에서 `DebuffTimers`를 순회하여 만료 처리.
만료된 항목을 별도 배열에 모은 뒤 루프 종료 후 일괄 제거 (순회 중 맵 수정 방지)

**Delegate 기반 UI 연동**

`OnDebuffApplied` / `OnDebuffRemoved` Multicast Delegate 브로드캐스트.
디버프 컴포넌트는 UI를 직접 알지 못하고, 위젯이 Delegate에 바인딩하여 상태 변화 시 자동 갱신

---

### 5. BehaviorTree 기반 AI — 디버프 상태에 따른 행동 변화

디버프 상태를 BehaviorTree에서 직접 감지하여 행동을 전환

```
Root
 └── Selector
      ├── Sequence (Stun 확인)
      │    ├── HasDebuff(Stun)?
      │    └── Wait (기절 중 대기)
      ├── Sequence (공격)
      │    ├── IsInRange?
      │    └── Attack
      └── Chase Player
```

| 디버프 | AI 행동 변화 |
|--------|-------------|
| Stun   | 이동 / 공격 완전 정지 |
| Slow   | MaxWalkSpeed 50% 감소 |
| Weaken | 받는 데미지 1.5배 증가 |

---

### 6. DataTable 기반 아이템/인벤토리 — C++ 수정 없이 아이템 추가

**픽업 → 보관 → 사용 흐름**

```
[픽업]
ABBBItemApple::OnPickup()
  → InventoryComponent->AddItem("Apple", 1)
  → OnInventoryChanged.Broadcast()

[UI 갱신]
OnInventoryChanged
  → WBP_Inventory::RefreshInventory()
  → WBP_InventorySlot 생성 → InitSlot(SlotData)

[사용]
WBP_ItemContextMenu::BtnUse OnClicked
  → HP Max 체크
  → InventoryComponent->UseItem(ItemID)
  → StatComponent->Heal(HealAmount)
```

**설계 포인트**

- `DT_ItemData` DataTable로 아이템 데이터 관리 → 행만 추가하면 새 아이템 확장, C++ 수정 불필요
- `BBBInventoryComponent`를 ActorComponent로 분리 → 캐릭터 외 다른 Actor에도 부착 가능
- 슬롯 클릭 → 컨텍스트 메뉴 방식 / BgDismiss(전체화면 투명 버튼, ZOrder 0)로 외부 클릭 감지

---

### 7. HittableInterface — 발사체 코드 수정 없이 피격 가능 오브젝트 확장

발사체가 피격 대상의 구체적인 클래스를 직접 참조하지 않도록 인터페이스 도입

```cpp
void BBBProjectileDebuff::OnProjectileHit()
{
    // Enemy : 기존 DebuffComponent 경로 유지
    if (UBBBDebuffComponent* Debuff = OtherActor->FindComponentByClass<...>())
        Debuff->ApplyDebuff(DebuffData);

    // 그 외 오브젝트 : 인터페이스 구현 여부만 확인
    if (IBBBHittableInterface* Hittable = Cast<IBBBHittableInterface>(OtherActor))
        Hittable->OnHitByProjectile();
}
```

- `ABBBAppleOnTree`가 인터페이스를 구현 → 발사체에 맞으면 Physics 낙하 후 아이템 스폰
- Enemy 로직과 완전 분리 — 새 피격 오브젝트 추가 시 발사체 코드 수정 불필요

---

### 8. Niagara 사망 이펙트 — AnimNotify/타이머 이중 구조로 모든 적 드롭 타이밍 보장

사망 시 이펙트 재생 타이밍을 몽타주 유무에 관계없이 일관되게 처리

```
[몽타주 있는 적]
OnEnemyDeath() → 사망 몽타주 재생
  → BBBAnimNotify_DeathEffect 발동 (프레임 정밀 타이밍)
      → OnDeathEffectNotify() : 이펙트 스폰 + DropItems()

[몽타주 없는 적 — 래그돌]
OnEnemyDeath() → 타이머(3.0f) 설정
  → OnDeathEffectNotify() : 이펙트 스폰 + DropItems()

[사과 오브젝트]
Physics 착지 → SpawnItemAndDestroy()
  → OnDeathEffectNotify() : 이펙트 스폰 + DropItems()
```

- `OnDeathEffectNotify()` 한 곳에 이펙트·드롭 로직 집중 — 진입 경로가 달라도 동일 함수 호출
- AnimNotify로 몽타주 길이와 무관하게 적마다 정확한 타이밍 제어
- 몽타주 없는 적은 타이머 폴백으로 처리 — 경우를 빠짐없이 대응

<div class="card-links" style="margin-top: 40px;">
  <a class="btn btn-primary" href="/">← 목록으로</a>
</div>
