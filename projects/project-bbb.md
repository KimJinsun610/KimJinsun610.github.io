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
| 개발 환경 | Visual Studio 2022, Unreal Engine 5.8, GitHub |
| 개발 인원 | 1인 |
| 개발 기간 | 2026.02 ~ 진행 중 |

---

## 클래스 계층 구조

```
AActor
└── ABBBCharacterBase          ← 무기 장착/교환, StatComponent, DebuffComponent
    ├── ABBBCharacterPlayer    ← 입력/이동, 조준, 무기 전환, 인벤토리/퀵슬롯
    └── ABBBEnemyBase          ← IBBBCharacterAIInterface, AI, 아이템 드롭, 사망 처리
        ├── ABBBEnemyMelee
        ├── ABBBEnemyRanged
        └── ABBBAppleOnTree    ← IBBBHittableInterface, 피격 낙하 오브젝트

AActor
└── ABBBItemBase               ← OnPickup() 추상화
    ├── ABBBItemApple          ← HP 회복 아이템
    └── ABBBItemCoin           ← 재화 아이템

AActor
└── ABBBWeaponBase             ← Attack() / StopAttack() 순수 가상 함수
    ├── ABBBWeaponMelee        ← HitBox 기반 콤보 공격
    └── ABBBWeaponRanged       ← 디버프 발사체 스폰, 쿨다운 관리

AActor
└── ABBBProjectileBase
    └── ABBBProjectileDebuff   ← 디버프 적용, HittableInterface 피격 판정 분기

UActorComponent
├── UBBBStatComponent          ← HP, 데미지, 사망
├── UBBBDebuffComponent        ← 디버프 적용/만료/UI 연동
├── UBBBInventoryComponent     ← 아이템 보관/사용/퀵슬롯
└── UBBBAudioManager           ← BGM/2D SFX 관리 (GameMode 부착)

interface
├── IBBBHittableInterface      ← 피격 가능 오브젝트 인터페이스
└── IBBBCharacterAIInterface   ← AI 캐릭터 공용 인터페이스 (EnemyBase 구현)

게임 프레임워크
├── AGameModeBase → ABBBGameModeBase          ← AudioManager 부착, 사망 처리·재화 커밋 흐름 관리
├── UGameInstance → UBBBGameInstance          ← 레벨 간 영속 데이터 (창고 아이템, 재화)
└── APlayerController → ABBBPlayerController  ← HUD/인벤토리/GameOver UI 표시 제어

Blueprint Interface
└── BPI_Interactable            ← 로비 상호작용 오브젝트(BP_DeliveryBox 등)에서 구현

```

---

## 구현 상세

<div class="detail-toc">
  <a href="#sec-1">1. 전략적 전투 루프</a>
  <span class="toc-sep">*</span>
  <a href="#sec-2">2. 아이템 / 인벤토리</a>
  <span class="toc-sep">*</span>
  <a href="#sec-3">3. HittableInterface</a>
  <span class="toc-sep">*</span>
  <a href="#sec-4">4. BehaviorTree AI</a>
  <span class="toc-sep">*</span>
  <a href="#sec-5">5. Niagara 이펙트</a>
  <span class="toc-sep">*</span>
  <a href="#sec-6">6. 사망 처리 재설계</a>
  <span class="toc-sep">*</span>
  <a href="#sec-7">7. 캐릭터 계층 구조</a>
  <span class="toc-sep">*</span>
  <a href="#sec-8">8. WeaponBase 추상화</a>
</div>


<a id="sec-1"></a>

## 1. 전략적 전투 루프 — 방어 게이지 제거 → 근거리 마무리

### 설계 목표

단순히 데미지를 누적하는 전투가 아닌, 원거리 공격과 근거리 공격이 서로 다른 역할을 갖도록 전투 구조를 설계하였습니다.

원거리 공격으로 적의 방어 게이지를 제거한 뒤 근거리 공격으로 마무리하는 교전 흐름을 구현하여, 공격 방식 전환과 전투 타이밍이 전략 요소로 작용하도록 설계하였습니다.

### 설계 포인트
- 원거리만으로는 처치 불가 → 방어 게이지 제거 후 접근하는 플레이 유도
- 일정 시간 후 방어 게이지 초기화 → 타이밍 관리가 전략 요소로 작용

<img class="detail-img" src="{{ '/assets/img/debuff.gif' | relative_url }}" alt="공격 루프 시스템 시연">

<div class="flow-card">
  <div class="flow-phase">
    <span class="flow-phase-label">원거리 모드 (기본)</span>
    <ul class="flow-steps">
      <li>발사체 명중 → 방어 게이지 감소</li>
      <li>방어 게이지 0 → 방어 해제 + Stun 적용</li>
      <li>HP바 위 방패 아이콘으로 잔여 게이지 표시</li>
    </ul>
  </div>
  <div class="flow-switch">V키 전환 ↓</div>
  <div class="flow-phase">
    <span class="flow-phase-label">근거리 모드</span>
    <ul class="flow-steps">
      <li>방어 해제 상태 적에게 데미지</li>
      <li>방어 게이지 잔존 시 처치 불가</li>
    </ul>
  </div>
</div>


---

<a id="sec-2"></a>

## 2. DataTable 기반 아이템 / 인벤토리

### 2-1. 아이템 시스템 — DataTable로 확장성 확보

### 설계 목표

초기에는 재화(Gold) 아이템만 존재했습니다. HP 회복 아이템(사과)을 추가하는 과정에서 아이템마다 C++ 코드를 수정하지 않아도 되는 구조가 필요해졌고,

DataTable을 도입하여 행 추가만으로 새 아이템을 등록할 수 있도록 설계했습니다.

### 설계 포인트

- DataTable로 아이템 데이터 관리 → 행만 추가하면 새 아이템 확장, C++ 수정 불필요
- Row Name(ItemID)으로 아이템 식별 → 별도 enum 추가 없이 DataTable 행 키만으로 구별
- **ItemBase**를 AActor 기반으로 추상화 → **OnPickup()** 오버라이드만으로 아이템별 독립 동작 구현

<img class="detail-img" src="{{ '/assets/img/DataTable.png' | relative_url }}" alt="DT_ItemData 구조">

---

### 2-2. 인벤토리 시스템 — Delegate 기반 UI 분리

### 설계 목표

인벤토리 로직과 UI를 Delegate 기반 이벤트 구조로 분리하였습니다.

컴포넌트가 UI를 직접 참조하지 않고 상태 변화만 알리도록 설계하여, 시스템 간 의존도를 낮추고 각각 독립적으로 동작할 수 있는 구조를 구현하였습니다.

### 설계 포인트

- OnInventoryChanged Multicast Delegate 브로드캐스트 — InventoryComponent가 UI를 직접 참조하지 않는 구조
- RefreshInventory 시 WBP_InventorySlot 동적 생성으로 슬롯 구성
- 아이템 사용 전 사용 가능 확인
- 슬롯 클릭 → 컨텍스트 메뉴 방식 / BgDismiss(전체화면 투명 버튼, ZOrder 0)로 외부 클릭 감지

**픽업 → 보관 → 사용 흐름**

<img class="detail-img" src="{{ '/assets/img/인벤토리.gif' | relative_url }}" alt="인벤토리 시스템 시연">

<div class="ts-box" markdown="1">

#### Trouble Shooting

**증상** : 게임 시작 시 아이템을 주운 후 인벤토리를 처음 열면 아이템이 표시되지 않는 문제가 발생했습니다.

**원인** : **WBP_Inventory**는 인벤토리 첫 오픈 시 **CreateWidget**으로 동적생성되어, 
생성 전에 발생한 **OnInventoryChanged.Broadcast()**의 수신자가 없어 무시되었습니다.

**해결** : **ToggleInventory()**에서 인벤토리를 열 때마다 **ProcessEvent**로 **RefreshInventory** 강제 호출하여 문제를 해결하였습니다.

```cpp
if (bIsInventoryOpen)
{
    InventoryWidget->AddToViewport();

    UFunction* Func = InventoryWidget->FindFunction(FName("RefreshInventory"));
    if (Func) InventoryWidget->ProcessEvent(Func, nullptr);
}
```

</div>

---

<a id="sec-3"></a>

## 3. 피격 가능 오브젝트 확장 (Hittable Interface)

### 설계 목표

코드 재사용성을 높이기 위해 EnemyBase를 상속받는 자연물 오브젝트를 추가하였습니다. 원거리 공격에 반응하는 자연물 오브젝트를 추가하는 과정에서, 기존 발사체가 Enemy의 디버프 처리 로직에 의존하는 구조의 한계를 확인하였습니다.

이를 해결하기 위해 HittableInterface를 도입하여 피격 대상의 구체적인 클래스가 아닌 인터페이스 구현 여부만 확인하도록 설계하였으며, Enemy는 방어도 감소, 자연물은 낙하와 같은 서로 다른 피격 반응을 독립적으로 구현할 수 있도록 구성하였습니다.

이를 통해 발사체 코드를 수정하지 않고도 새로운 피격 오브젝트를 손쉽게 확장할 수 있는 구조를 구현하였습니다.

### 설계 포인트
- 발사체가 특정 Enemy 클래스에 의존하지 않도록 HittableInterface를 도입
- Enemy와 자연물이 서로 다른 피격 반응을 독립적으로 구현할 수 있도록 구조 분리
- 새로운 피격 오브젝트 추가 시 발사체 코드 수정 없이 확장 가능한 구조 설계

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

<div class="ts-box" markdown="1">

#### Trouble Shooting

**증상** : 공중에 배치한 사과 오브젝트가 총에 맞자마자 즉시 사라지고, 아이템이 낙하 위치가 아닌 사과 초기 위치(공중)에 스폰되는 문제가 발생했습니다.

---
**원인 1 — 피격 직후 즉시 아이템 생성**

사과 오브젝트는 **ACharacter**를 상속받고 있어 게임 시작과 동시에 **CharacterMovementComponent**의 중력 영향을 받았습니다.

이 과정에서 루트 컴포넌트인 **CapsuleComponent**는 지면으로 이동했지만, 메쉬는 공중 위치를 유지하고 있었습니다.

이후 **SetSimulatePhysics(true)**를 호출하자 메쉬가 인접한 나무 지오메트리와 이미 충돌 중인 상태로 판정되었고, 그 결과 **OnComponentHit** 이벤트가 즉시 발생하여 아이템이 바로 생성되는 문제가 발생했습니다.

**원인 2 — 아이템이 공중에 생성됨**

**SetSimulatePhysics(true)** 이후 물리 시뮬레이션은 메쉬에만 적용되고, Actor의 루트인 **CapsuleComponent**는 기존 위치에 그대로 유지되었습니다.

따라서 사과가 실제로 바닥에 착지하더라도 **GetActorLocation()**은 사과 메쉬의 위치가 아닌 루트 컴포넌트의 초기 위치를 반환하였습니다.

그 결과 아이템 생성 위치 계산에 잘못된 좌표가 사용되어 아이템이 공중에 생성되는 문제가 발생했습니다.

---
**해결 1 — 즉시 사라짐 방지:** **CharacterMovement** 비활성화 + **GravityScale = 0** 설정으로 루트 컴포넌트의 이동을 차단하였습니다. 또한, **SetSimulatePhysics(true)** 호출 후 0.1초 딜레이를 두고 OnComponentHit 등록하여 나무 접촉 이벤트 무시하도록 구현하였습니다.

```cpp
// BeginPlay
GetCharacterMovement()->DisableMovement();
GetCharacterMovement()->GravityScale = 0.0f;

// SetSimulatePhysics 호출 후
GetWorld()->GetTimerManager().SetTimer(LandingDetectTimer, [this]()
{
    if (AppleMesh && !bHasLanded)
        AppleMesh->OnComponentHit.AddDynamic(
                              this, 
                              &ABBBAppleOnTree::OnAppleLanded);
}, 0.1f, false);
```

**해결 2 — 아이템 스폰 위치 보정:** **DropItems()** 호출 전 Actor 위치를 **AppleMesh**의 현재 위치로 갱신하였습니다.

```cpp
void ABBBAppleOnTree::SpawnItemAndDestroy()
{
    if (AppleMesh)
        SetActorLocation(AppleMesh->GetComponentLocation());

    OnDeathEffectNotify(); // 이펙트 + DropItems()
    Destroy();
}
```

</div>

---

<a id="sec-4"></a>

## 4. BehaviorTree 기반 AI — 탐지·순찰·추격·공격 상태 전환

### 설계 목표

플레이어 감지 여부와 공격 가능 거리에 따라 AI의 행동이 자동으로 전환되도록 설계하였습니다.

행동 결정에 필요한 상태를 Blackboard로 관리하여, C++ 로직 수정 없이도 값 조정만으로 AI 패턴을 변경할 수 있는 유연한 구조를 구현하였습니다.

| 상태 | 조건 | 행동 |
|------|------|------|
| 순찰 | Target 없음 | 랜덤 위치 이동 → 대기 반복 |
| 추격 | Target 있음, 사정거리 밖 | 플레이어 방향으로 이동 |
| 공격 | Target 있음, 사정거리 내 | 발사체 공격 |


<img class="detail-img" src="{{ '/assets/img/AI_BT.png' | relative_url }}" alt="BehaviorTree 구조">

```
Root
 └── Selector  (Detect 서비스 : 0.9s ~ 1.1s 주기 탐색)
      ├── On Target  (Blackboard: Target is Set)
      │    └── Selector  (Detect 서비스 : 0.0s ~ 0.2s 재탐색)
      │         ├── CanAttack_Ranged  →  Attack              ← 사정거리 내
      │         └── CanAttack_Ranged (inversed)  →  Move To  ← 추격
      └── No Target  (Blackboard: Target is Not Set)
           └── Sequence
                ├── Wait  (0.5 ± 1.0s)
                ├── FindPatrolPos
                └── Move To PatrolPos
```


---

<a id="sec-5"></a>

## 5. Niagara 사망 이펙트 — AnimNotify/타이머 이중 구조로 모든 적 드롭 타이밍 보장

### 설계 목표

사망 애니메이션의 존재 여부와 관계없이 모든 적 유형에서 이펙트와 아이템 드롭이 동일한 시점에 처리되도록 설계하였습니다.

이펙트 및 드롭 로직을 단일 함수로 통합하고, AnimNotify와 타이머가 동일한 진입점을 사용하도록 구성하여 다양한 사망 처리 경로에서도 일관된 결과를 보장하였습니다.

### 설계 포인트
- **OnDeathEffectNotify()** 한 곳에 이펙트·드롭 로직 집중 — 진입 경로가 달라도 동일 함수 호출
- AnimNotify로 몽타주 길이와 무관하게 적마다 정확한 타이밍 제어
- 몽타주 없는 적은 타이머 폴백으로 처리 — 경우를 빠짐없이 대응

<img class="detail-img" src="{{ '/assets/img/Apple.gif' | relative_url }}" alt="아이템&이팩트 시스템 시연">

<div class="box_highlight">🎬 <strong>몽타주 있는 적</strong> — OnEnemyDeath() → 사망 몽타주 재생 → AnimNotify 발동 → 이펙트 스폰 + DropItems()</div>
<div class="box_highlight">💀 <strong>몽타주 없는 적 (래그돌)</strong> — OnEnemyDeath() → 타이머(3.0f) 후 → 이펙트 스폰 + DropItems()</div>
<div class="box_highlight">🍎 <strong>사과 오브젝트</strong> — Physics 착지 → SpawnItemAndDestroy() → 이펙트 스폰 + DropItems()</div>


---

<a id="sec-6"></a>

## 6. 사망 처리 재설계 — GameInstance 커밋 시점 분리 (재시도 / 로비 복귀 대응)

### 설계 목표

로비-던전 구조를 도입하면서 사망 시 "이대로 돌아가기"(획득분 유지)와 "라운드 재시도"(획득분 포기) 두 선택지를 제공해야 했습니다.

기존 구조는 사망 즉시 재화·아이템을 GameInstance에 반영하고 있어서, 재시도를 선택해도 이미 반영된 값을 되돌릴 방법이 없는 구조적 한계가 있었습니다. 이를 해결하기 위해 "영구 상태 반영은 이벤트가 발생한 시점이 아니라 유저가 선택을 확정한 시점에 이뤄져야 한다"는 원칙으로 사망 처리 흐름을 재설계하였습니다.

### 설계 포인트
- 사망 시점엔 결과를 캐시(`CachedSlots`, `CachedGold`)만 해두고, GameInstance 반영은 `ConfirmReturnToLobby` 단 한 곳에서만 수행
- "이번 판에서 번 재화"(`RoundEarnedGold`)를 뱅크 잔액 누적 표시값(`Gold`)과 분리 추적 → GameInstance엔 항상 신규 획득분만 커밋
- 재시도는 캐시를 폐기하고 레벨만 재로드 — Character/Inventory가 새 액터로 자동 초기화되어 별도 롤백 로직 불필요
- Game Over UI 데이터도 살아있는 `InventoryComponent*` 포인터 대신 `TArray<FBBBInventorySlot>` 스냅샷으로 전달 — Pawn 소멸 타이밍에 따른 댕글링 위험 제거

<div class="flow-card">
  <div class="flow-phase">
    <span class="flow-phase-label">사망 시점 (OnPlayerDeath)</span>
    <ul class="flow-steps">
      <li>InventoryComponent → GetMergedSlots() 스냅샷 캐시</li>
      <li>RoundEarnedGold 캐시</li>
      <li>GameInstance 반영 없음</li>
    </ul>
  </div>
  <div class="flow-switch">2초 후 Game Over UI 표시 ↓</div>
  <div class="flow-phase">
    <span class="flow-phase-label">유저 선택 확정</span>
    <ul class="flow-steps">
      <li>"이대로 돌아가기" → ConfirmReturnToLobby(캐시) → GameInstance 반영</li>
      <li>"라운드 재시도" → 캐시 폐기, 레벨 재로드</li>
    </ul>
  </div>
</div>

<div class="ts-box" markdown="1">

#### Trouble Shooting

**증상** : 사망을 반복할수록 보유 재화(Jem) 뱅크 잔액이 기하급수적으로 불어나는 문제가 발생했습니다. (예: 뱅크 100 + 이번 판 20 획득 후 사망 → 220으로 반영, 정답은 120)

**원인** : `Gold`는 **BeginPlay** 시점에 `GI->Gold`(뱅크 잔액)를 복사해서 시작하는 "뱅크 잔액 + 이번 판 획득량" 누적값이었습니다. 사망 시 `GI->Gold += Gold`를 호출하면서 이미 포함되어 있던 뱅크 잔액을 통째로 또 더해버리는 구조였고, 이 커밋마저 유저의 선택보다 먼저 사망 즉시 무조건 실행되고 있었습니다.

**해결** : "이번 판에서만 번 양"을 `RoundEarnedGold`라는 별도 변수로 처음부터 같이 누적하여, GameInstance에는 항상 신규 획득분만 더하도록 분리하였습니다.

```cpp
void ABBBCharacterPlayer::AddGold(int32 Amount)
{
    Gold += Amount;            // HUD 표시용 누적값 (뱅크 + 이번 판)
    RoundEarnedGold += Amount; // GameInstance 커밋용 (이번 판 획득분만)
}
```

</div>

---

<a id="sec-7"></a>

## 7. 캐릭터 계층 구조 (CharacterBase 공통화)

### 설계 목표

플레이어와 적이 공통으로 사용하는 공격, 피격 처리, 컴포넌트 관리 기능을 CharacterBase에 통합하였습니다. 이를 통해 중복 구현을 제거하고 공통 로직을 일관되게 관리할 수 있도록 설계하였으며, 새로운 캐릭터는 CharacterBase를 상속하는 것만으로 기본 기능을 확보할 수 있도록 확장성을 고려하였습니다.

### 설계 포인트

- **StatComponent**, **DebuffComponent** 부착 — 플레이어/적 모두 동일한 피격·사망 처리
- 공격 방식 지정/교환 로직을 Base에서 통합 — Player, Enemy 모두 재사용
- 새 캐릭터 추가 시 **CharacterBase** 상속만으로 기반 기능 자동 확보

---

<a id="sec-8"></a>

## 8. WeaponBase 추상화 — Base 수정 없이 원거리/근거리 무기 독립 확장

### 설계 목표

무기 종류가 증가하더라도 캐릭터나 상위 클래스의 수정 없이 기능을 확장할 수 있도록 WeaponBase를 추상화하였습니다.

Attack() / StopAttack()을 순수 가상 함수로 선언하여 무기별 공격 방식을 독립적으로 구현하였으며, 캐릭터는 무기의 구체적인 타입을 알 필요 없이 Attack() 호출만으로 공격을 수행할 수 있도록 설계하였습니다.

```
WeaponBase::Attack()   ← PURE_VIRTUAL
   ├── WeaponMelee     : HitBox 활성화, 콤보 애니메이션 재생
   └── WeaponRanged    : ProjectileDebuff 스폰, 발사 쿨다운 관리
```
### 설계 포인트
- 캐릭터는 **CurrentWeapon->Attack()** 한 줄만 호출 — 무기 종류를 직접 알 필요 없음
- V키 입력 시 **Equip()** / **Unequip()**으로 플레이어 무기 교체, WeaponBase 코드 수정 불필요

---

<div class="card-links" style="margin-top: 40px;">
  <a class="btn btn-primary" href="/">← 목록으로</a>
</div>

<nav class="floating-toc" id="floatingToc">
  <p class="ftoc-title">구현 상세</p>
  <ol>
    <li><a href="#sec-1">전략적 전투 루프</a></li>
    <li><a href="#sec-2">아이템 / 인벤토리</a></li>
    <li><a href="#sec-3">HittableInterface</a></li>
    <li><a href="#sec-4">BehaviorTree AI</a></li>
    <li><a href="#sec-5">Niagara 이펙트</a></li>
    <li><a href="#sec-6">사망 처리 재설계</a></li>
    <li><a href="#sec-7">캐릭터 계층 구조</a></li>
    <li><a href="#sec-8">WeaponBase 추상화</a></li>
  </ol>
</nav>

<a class="scroll-up-left" id="scrollUpLeft" href="#" aria-label="맨 위로 이동">↑</a>

<script>
  (function () {
    var btn = document.getElementById('scrollUpLeft');
    var toc = document.getElementById('floatingToc');
    var tocLinks = Array.from(toc.querySelectorAll('a'));
    var sections = [1,2,3,4,5,6,7,8].map(function(n) {
      return document.getElementById('sec-' + n);
    }).filter(Boolean);
    var trigger = document.querySelector('.detail-toc');

    function onScroll() {
      var y = window.scrollY;

      // 위로 버튼
      btn.classList.toggle('visible', y > 300);

      // 플로팅 TOC: 상단 인라인 TOC를 완전히 지나쳤을 때 표시
      if (trigger) {
        toc.classList.toggle('visible', trigger.getBoundingClientRect().bottom < 0);
      }

      // 현재 섹션 하이라이트
      var current = -1;
      sections.forEach(function(sec, i) {
        if (sec.getBoundingClientRect().top <= 100) current = i;
      });
      tocLinks.forEach(function(link, i) {
        link.classList.toggle('ftoc-active', i === current);
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();
</script>
