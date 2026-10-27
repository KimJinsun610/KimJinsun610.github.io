---
layout: page
title: Project BBB
permalink: /projects/project-bbb/
---

<div class="case-detail">
<div class="instruction-summary tag-row" role="list" aria-label="주요 구현 기술">
  <span class="tag" role="listitem">UE5 C++</span>
  <span class="tag" role="listitem">GameInstance 영속 데이터</span>
  <span class="tag" role="listitem">Delegate 기반 UI 분리</span>
  <span class="tag" role="listitem">인터페이스 기반 피격 확장</span>
  <span class="tag" role="listitem">BehaviorTree AI</span>
  <span class="tag" role="listitem">DataTable 아이템</span>
</div>
<div class="card-links">
  <a class="btn" href="https://github.com/KimJinsun610/Project_BBB" target="_blank" rel="noopener noreferrer">GitHub</a>
  <a class="btn" href="https://youtu.be/-PDFx8YqYMc" target="_blank" rel="noopener noreferrer">게임플레이 영상</a>
  <a class="btn" href="https://www.notion.so/UNREAL-2eaeaebf4a0d8040ba38c7a177fde2be" target="_blank" rel="noopener noreferrer">개발 일지(Notion)</a>
</div>
</div>

원거리 공격으로 적의 방어를 벗기고 근거리 공격으로 마무리하는 **Unreal Engine 5 기반 1인 액션 게임**입니다. 던전에서 모은 아이템과 재화를 로비로 가져와 납품하는 흐름까지 C++로 직접 설계하고 구현했습니다.

| 항목 | 내용 |
|---|---|
| 기간 · 인원 | 2026.02 ~ 2026.07 · 1인 개발 |
| 담당 | 기획 · 전체 구현 (전투 · AI · 아이템/인벤토리 · 로비-던전 흐름 · UI) |
| 환경 | C++ · Unreal Engine 5.8 · Visual Studio 2022 · GitHub |

## 주요 구현과 문제 해결

<nav class="detail-toc" aria-label="Project BBB 기술 사례">
  <a href="#death-commit">01 사망 처리·재화 커밋</a>
  <span class="toc-sep">/</span>
  <a href="#physics-location">02 물리 전환 위치 보정</a>
  <span class="toc-sep">/</span>
  <a href="#inventory-refresh">03 인벤토리 갱신 누락</a>
  <span class="toc-sep">/</span>
  <a href="#hot-reload">04 Hot Reload 참조 깨짐</a>
  <span class="toc-sep">/</span>
  <a href="#supporting-work">보조 구현</a>
</nav>

<a id="death-commit"></a>

## 01. 사망 처리 재설계와 재화 커밋 시점 분리

**GameInstance · 커밋 시점 지연 · 스냅샷 전달**

<div class="experience-summary" markdown="1">

**문제** · 사망할 때마다 보유 재화가 기존 잔액만큼 다시 더해지고, 「라운드 재시도」를 골라도 이미 반영된 값을 되돌릴 수 없었습니다.

**해결** · 이번 판 획득량을 따로 누적하고, GameInstance 반영을 사망 시점이 아니라 유저가 선택을 확정한 시점으로 옮겼습니다.

</div>

### 문제 상황

로비-던전 구조를 도입하면서 사망 시 「이대로 돌아가기」(획득분 유지)와 「라운드 재시도」(획득분 포기)를 고를 수 있게 해야 했습니다. 그런데 사망을 반복할수록 로비의 보유 재화(Jem)가 불어났습니다. 잔액 100에서 이번 판 20을 얻고 사망하면 120이 아니라 220이 되었습니다.

### 원인 분석

플레이어의 `Gold`는 `BeginPlay`에서 `GI->Gold`(보유 잔액)를 복사해 시작하는 **잔액 + 이번 판 획득량** 누적값이었습니다. 사망 시 `GI->Gold += Gold`로 반영하면서, 이미 들어 있던 잔액을 한 번 더 더하고 있었습니다.

게다가 이 반영이 유저의 선택보다 먼저, 사망 즉시 실행되고 있었습니다. 재시도를 골라도 GameInstance에는 이미 값이 들어간 뒤라 되돌릴 방법이 없었습니다. **값을 잘못 더한 문제와, 영구 상태를 너무 일찍 바꾼 문제가 겹쳐 있었습니다.**

### 해결 과정

- **획득량 분리** — 화면 표시용 `Gold`와 별도로 `RoundEarnedGold`를 함께 누적해, GameInstance에는 항상 이번 판 획득분만 더합니다.
- **커밋 시점 지연** — 사망 시점에는 인벤토리 스냅샷과 획득량을 캐시만 해 두고, `ConfirmReturnToLobby` 한 곳에서만 GameInstance에 반영합니다.
- **스냅샷 전달** — 2초 뒤 띄우는 Game Over UI에는 살아 있는 `InventoryComponent` 포인터 대신 `GetMergedSlots()` 스냅샷 배열을 넘겨, Pawn이 먼저 사라져도 안전하게 했습니다.
- **재시도** — 캐시를 버리고 레벨만 다시 불러옵니다. 캐릭터와 인벤토리가 새 액터로 초기화되므로 별도 롤백 코드가 필요 없습니다.

```cpp
void ABBBCharacterPlayer::AddGold(int32 Amount)
{
    Gold += Amount;            // HUD 표시용 (보유 잔액 + 이번 판)
    RoundEarnedGold += Amount; // GameInstance 커밋용 (이번 판 획득분만)
}

void ABBBGameModeBase::ConfirmReturnToLobby(const TArray<FBBBInventorySlot>& EarnedSlots, int32 EarnedGold)
{
    UBBBGameInstance* GI = Cast<UBBBGameInstance>(GetGameInstance());
    if (GI)
    {
        GI->MergeInventory(EarnedSlots);
        GI->AddGold(EarnedGold);
    }
}
```

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
      <li>「이대로 돌아가기」 → ConfirmReturnToLobby → GameInstance 반영</li>
      <li>「라운드 재시도」 → 캐시 폐기, 레벨 재로드</li>
    </ul>
  </div>
</div>

### 결과와 한계

재화가 중복으로 더해지지 않고, 재시도를 고르면 이번 판의 획득분이 깔끔하게 사라집니다. **「영구 상태는 이벤트가 일어난 시점이 아니라 유저가 확정한 시점에 반영한다」**는 기준을 세운 사례입니다.

표시용 `Gold`와 커밋용 `RoundEarnedGold`를 함께 갱신하는 구조라, 재화를 바꾸는 경로를 새로 만들 때는 두 값을 같이 맞춰야 합니다.

**구현 코드:** [BBBCharacterPlayer.cpp — AddGold / OnPlayerDeath][src-player] · [BBBGameModeBase.cpp — ConfirmReturnToLobby][src-gamemode]

<a id="physics-location"></a>

## 02. 물리 전환 시 루트와 메시 위치 불일치

**ACharacter 상속 · SetSimulatePhysics · 충돌 이벤트 등록 시점**

<div class="experience-summary" markdown="1">

**문제** · 나무에 달린 사과를 쏘면 떨어지기도 전에 사라지고, 아이템이 착지 지점이 아닌 공중에 생성됐습니다.

**해결** · 캐릭터 이동의 중력을 끄고, 물리 전환 직후의 접촉을 피해 충돌 이벤트를 늦게 등록하고, 아이템 생성 전에 액터 위치를 메시 위치로 맞췄습니다.

</div>

### 문제 상황

사과는 원거리 공격에 맞으면 떨어져 아이템을 남기는 자연물 오브젝트입니다. 적과 같은 사망·드롭 흐름을 재사용하려고 `EnemyBase`(`ACharacter` 계열)를 상속했습니다. 그런데 맞자마자 사과가 사라지고, 아이템은 사과가 처음 매달려 있던 공중에 생겼습니다.

### 원인 분석

두 증상의 원인은 모두 **루트(CapsuleComponent)와 메시의 위치가 따로 움직인 것**이었습니다.

- **즉시 사라짐** — `ACharacter`라서 게임 시작과 동시에 `CharacterMovementComponent`의 중력을 받았습니다. 캡슐은 바닥으로 내려갔지만 메시는 공중에 남았고, 이 상태에서 `SetSimulatePhysics(true)`를 켜자 메시가 붙어 있던 나무와 이미 충돌 중으로 판정되어 `OnComponentHit`가 곧바로 발생했습니다.
- **공중 생성** — 물리 시뮬레이션은 메시에만 적용되고 루트는 제자리에 남습니다. 사과가 바닥에 닿아도 `GetActorLocation()`은 루트의 처음 위치를 돌려줘, 그 좌표에 아이템이 생성됐습니다.

### 해결 과정

- **루트 고정** — `BeginPlay`에서 `DisableMovement()`와 `GravityScale = 0`으로 캡슐이 혼자 내려가지 않게 했습니다.
- **충돌 이벤트 지연 등록** — 물리를 켠 뒤 0.1초 후에 `OnComponentHit`를 등록해, 나무와의 첫 접촉을 착지로 세지 않게 했습니다. 끝내 착지 판정이 오지 않는 경우를 위해 3초 안전 타이머도 두었습니다.
- **위치 보정** — 아이템을 만들기 전에 `SetActorLocation(AppleMesh->GetComponentLocation())`으로 액터를 메시가 있는 곳으로 옮겼습니다.

```cpp
// 물리 전환 직후 접촉은 무시하고, 0.1초 뒤부터 착지를 감지
AppleMesh->SetSimulatePhysics(true);
GetWorld()->GetTimerManager().SetTimer(LandingDetectTimer, [this]()
{
    if (AppleMesh && !bHasLanded)
        AppleMesh->OnComponentHit.AddDynamic(this, &ABBBAppleOnTree::OnAppleLanded);
}, 0.1f, false);

void ABBBAppleOnTree::SpawnItemAndDestroy()
{
    if (AppleMesh)
    {
        SetActorLocation(AppleMesh->GetComponentLocation());
        AppleMesh->SetVisibility(false);
    }
    OnDeathEffectNotify(); // 이펙트 + 아이템 드롭
}
```

### 결과와 한계

사과가 실제로 떨어진 자리에서 이펙트와 아이템이 생성됩니다. **「위치가 이상하다」는 증상을, 어느 컴포넌트가 실제로 움직이는지 나눠서 추적한 사례**입니다.

0.1초 지연은 물리 전환 순간의 접촉을 시간으로 건너뛰는 방식이라, 오브젝트가 다른 물체와 맞닿은 배치에서는 지연 값을 다시 확인해야 합니다. 적 흐름을 재사용하려고 `ACharacter`를 상속한 대가로 쓰지 않는 이동 컴포넌트를 꺼 두는 처리가 필요했습니다.

**구현 코드:** [BBBAppleOnTree.cpp — 낙하·착지·위치 보정][src-apple]

<a id="inventory-refresh"></a>

## 03. 동적 생성 위젯이 놓친 인벤토리 갱신 이벤트

**Multicast Delegate · CreateWidget 시점 · 열 때마다 갱신**

<div class="experience-summary" markdown="1">

**문제** · 게임 시작 후 아이템을 줍고 인벤토리를 처음 열면, 주운 아이템이 보이지 않았습니다.

**해결** · 인벤토리를 열 때마다 위젯의 갱신 함수를 직접 호출해, 위젯이 생기기 전의 변경도 화면에 반영했습니다.

</div>

### 문제 상황

인벤토리 로직(`InventoryComponent`)과 UI는 Delegate로 분리했습니다. 컴포넌트는 UI를 직접 참조하지 않고, 상태가 바뀌면 `OnInventoryChanged`를 브로드캐스트만 합니다. 이 구조에서 첫 오픈 때만 아이템 목록이 비어 있었습니다.

<img class="detail-img" src="{{ '/assets/img/인벤토리.gif' | relative_url }}" alt="아이템 픽업, 인벤토리 보관, 사용 흐름 시연" loading="lazy">

### 원인 분석

`WBP_Inventory`는 인벤토리를 처음 열 때 `CreateWidget`으로 만들어집니다. 그 전에 아이템을 주우면 `OnInventoryChanged.Broadcast()`가 일어나도 **받을 위젯이 아직 없어** 이벤트가 그냥 사라졌습니다. Delegate는 변경을 알려 줄 뿐, 놓친 변경을 다시 보내 주지 않습니다.

### 해결 과정

`ToggleInventory()`에서 인벤토리를 열 때마다 위젯의 `RefreshInventory`를 직접 호출하게 했습니다. 이벤트를 놓쳤는지와 상관없이, 열리는 순간 현재 인벤토리 상태로 다시 그립니다.

```cpp
if (bIsInventoryOpen)
{
    InventoryWidget->AddToViewport();

    UFunction* Func = InventoryWidget->FindFunction(FName("RefreshInventory"));
    if (Func)
    {
        InventoryWidget->ProcessEvent(Func, nullptr);
    }
}
```

### 결과와 한계

처음 열 때도 주운 아이템이 정상적으로 보입니다. Delegate 기반 분리는 유지하면서, **「이벤트는 받는 쪽이 존재할 때만 전달된다」**는 점을 화면 표시 시점에서 보완한 사례입니다.

갱신 함수를 이름 문자열(`"RefreshInventory"`)로 찾기 때문에, 위젯 쪽 함수 이름이 바뀌면 컴파일 오류 없이 호출만 빠집니다.

**구현 코드:** [BBBPlayerController.cpp — ToggleInventory][src-pc]

<a id="hot-reload"></a>

## 04. Hot Reload 누적으로 깨진 DataTable 참조

**Hot Reload · DataTable Row Structure · Blueprint Interface**

<div class="experience-summary" markdown="1">

**문제** · 로비 상호작용 인터페이스를 C++로 자주 고치던 중, 아이템 DataTable이 에디터에서 열리지 않고 재시작해도 복구되지 않았습니다.

**해결** · 자주 바뀌는 상호작용 인터페이스를 Blueprint Interface(`BPI_Interactable`)로 옮겨, C++ 재컴파일 없이 수정하게 했습니다.

</div>

### 문제 상황

로비의 납품 상자 같은 상호작용 오브젝트를 C++ `UInterface`로 만들고 수정을 반복했습니다. 어느 순간부터 아이템 데이터 테이블 `DT_ItemData`가 에디터에서 열리지 않았고, 에디터를 다시 켜도 그대로였습니다.

### 원인 분석

C++ 코드를 고친 뒤 에디터를 재시작하지 않고 **Hot Reload로 반영하는 일이 쌓이면서**, DataTable의 Row Structure가 Hot Reload가 만든 임시 클래스를 가리키게 되어 원래 구조체 참조가 깨졌습니다. 상호작용처럼 자주 고치는 C++ 코드일수록 Hot Reload 횟수가 많아 이 문제가 생기기 쉬웠습니다.

### 해결 과정

C++과 Blueprint를 함께 쓰는 프로젝트에서 **자주 바뀌는 인터페이스는 Blueprint Interface로 전환**했습니다. `BPI_Interactable`은 `BP_DeliveryBox` 같은 Blueprint Actor에서 바로 구현할 수 있어, 상호작용을 고칠 때 C++ 재컴파일과 Hot Reload를 거치지 않습니다.

### 결과와 한계

상호작용 로직을 반복 수정하는 동안 C++ 쪽 타입이 바뀌지 않게 되었습니다. **문제의 직접 원인(DataTable 참조)이 아니라, 그 원인을 자주 일으키는 작업 방식을 바꾼 사례**입니다.

DataTable의 Row Structure는 여전히 C++ 구조체이므로, 그 구조체를 고칠 때는 Hot Reload 영향을 받을 수 있습니다.

<a id="supporting-work"></a>

## 게임을 구성하는 보조 구현

핵심 사례 외에 전투 · AI · 아이템 · 로비 흐름과 클래스 구조를 직접 설계했습니다.

<details class="collapse-block" markdown="1">
<summary class="btn">전투 루프 · 피격 인터페이스 <span class="chevron">▾</span></summary>

- **전투 루프** — 원거리 공격으로 적의 방어 게이지를 깎은 뒤, 근거리 공격으로 마무리하는 흐름입니다. 원거리만으로는 처치할 수 없고, 방어 게이지는 일정 시간 뒤 다시 차서 무기 전환 타이밍이 전략 요소가 됩니다. 남은 게이지는 HP바 위 방패 아이콘으로 표시합니다.
- **HittableInterface** — 발사체가 특정 Enemy 클래스에 의존하지 않도록, 피격 대상이 `IBBBHittableInterface`를 구현했는지만 확인합니다. 적은 방어도 감소, 사과는 낙하처럼 서로 다른 반응을 각자 구현하고, 새 피격 오브젝트를 추가해도 발사체 코드는 바꾸지 않습니다.

<img class="detail-img" src="{{ '/assets/img/debuff.gif' | relative_url }}" alt="원거리로 방어 게이지를 제거한 뒤 근거리로 마무리하는 전투 시연" loading="lazy">

```cpp
void ABBBProjectileDebuff::OnProjectileHit(AActor* HitActor, const FHitResult& Hit)
{
    // 적: DebuffComponent 경로
    if (UBBBDebuffComponent* DebuffComp = HitActor->FindComponentByClass<UBBBDebuffComponent>())
        DebuffComp->ApplyDebuff(DebuffData);

    // 그 밖의 오브젝트: 인터페이스 구현 여부만 확인
    if (IBBBHittableInterface* Hittable = Cast<IBBBHittableInterface>(HitActor))
        Hittable->OnHitByProjectile(this);
}
```

</details>

<details class="collapse-block" markdown="1">
<summary class="btn">BehaviorTree AI <span class="chevron">▾</span></summary>

플레이어 감지 여부와 사정거리에 따라 행동이 바뀌도록 BehaviorTree를 구성했습니다. 행동 판단에 쓰는 상태는 Blackboard로 관리해, C++을 고치지 않고 값 조정만으로 패턴을 바꿀 수 있습니다.

| 상태 | 조건 | 행동 |
|---|---|---|
| 순찰 | Target 없음 | 랜덤 위치 이동 → 대기 반복 |
| 추격 | Target 있음, 사정거리 밖 | 플레이어 방향으로 이동 |
| 공격 | Target 있음, 사정거리 안 | 발사체 공격 |

<img class="detail-img" src="{{ '/assets/img/AI_BT.png' | relative_url }}" alt="BehaviorTree 구조" loading="lazy">

```text
Root
 └── Selector  (Detect 서비스: 0.9 ~ 1.1초 주기 탐색)
      ├── On Target  (Blackboard: Target is Set)
      │    └── Selector  (Detect 서비스: 0.0 ~ 0.2초 재탐색)
      │         ├── CanAttack_Ranged  →  Attack              ← 사정거리 안
      │         └── CanAttack_Ranged (inversed)  →  Move To  ← 추격
      └── No Target  (Blackboard: Target is Not Set)
           └── Sequence
                ├── Wait  (0.5 ± 1.0초)
                ├── FindPatrolPos
                └── Move To PatrolPos
```

</details>

<details class="collapse-block" markdown="1">
<summary class="btn">DataTable 아이템 · Niagara 사망 이펙트 <span class="chevron">▾</span></summary>

- **DataTable 아이템** — 재화만 있던 아이템에 HP 회복 사과를 더하면서, 아이템마다 C++을 고치지 않도록 DataTable로 데이터를 옮겼습니다. Row Name(ItemID)으로 아이템을 구별하고, `ItemBase`의 `OnPickup()`만 오버라이드해 아이템별 동작을 만듭니다.
- **사망 이펙트 · 드롭** — 이펙트와 아이템 드롭을 `OnDeathEffectNotify()` 하나로 모았습니다. 사망 몽타주가 있는 적은 AnimNotify, 몽타주 없는 래그돌 적은 3초 타이머, 사과는 착지 시점에 같은 함수를 호출해 모든 경우 같은 결과를 냅니다.

<img class="detail-img" src="{{ '/assets/img/DataTable.png' | relative_url }}" alt="DT_ItemData 구조" loading="lazy">

<img class="detail-img" src="{{ '/assets/img/Apple.gif' | relative_url }}" alt="사과 낙하와 아이템·이펙트 생성 시연" loading="lazy">

</details>

<details class="collapse-block" markdown="1">
<summary class="btn">로비-던전 흐름 · 납품 <span class="chevron">▾</span></summary>

단일 던전 구조를 로비-던전 왕복 구조로 넓히면서, 레벨이 바뀌어도 남아야 하는 창고 아이템과 재화를 `UBBBGameInstance` 한 곳에 두었습니다. 모든 레벨은 이 값을 참조만 해, 레벨 전환마다 데이터를 옮겨 담지 않습니다.

- **납품은 등록과 제출을 분리** — 등록할 때 창고에서 바로 차감하고, 제출은 재화 지급만 해 이중 차감을 막았습니다.
- **취소 시 복구** — 제출을 취소하면 등록한 아이템을 `MergeInventory`로 창고에 되돌려, 잘못 등록해도 손해가 없습니다.

```text
UBBBGameInstance
├─ WarehouseSlots (TArray<FBBBInventorySlot>)  ← 레벨 간 유지되는 보유 아이템
├─ Gold (int32)                                ← 보유 재화
├─ MergeInventory(Slots)                       ← 누적 합산 (덮어쓰기 아님)
├─ AddGold(Amount)
├─ RemoveFromWarehouse(ItemID, Count)
└─ ClearWarehouse()
```

</details>

<details class="collapse-block" markdown="1">
<summary class="btn">클래스 계층 구조 <span class="chevron">▾</span></summary>

- **CharacterBase 공통화** — 플레이어와 적이 함께 쓰는 공격 · 피격 · 컴포넌트 관리를 `ABBBCharacterBase`에 모았습니다. 새 캐릭터는 상속만으로 `StatComponent` · `DebuffComponent` 기반 피격·사망 처리를 얻습니다.
- **WeaponBase 추상화** — `Attack()` / `StopAttack()`을 순수 가상 함수로 두고, 캐릭터는 `CurrentWeapon->Attack()`만 호출합니다. 무기를 추가하거나 V키로 교체해도 캐릭터와 Base 코드는 바뀌지 않습니다.

```text
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

**구현 코드:** [BBBWeaponBase.h — Attack / StopAttack 순수 가상 함수][src-weapon]

</details>

<div class="card-links" style="margin-top: 32px;">
  <a class="btn btn-primary" href="{{ '/' | relative_url }}#project-bbb">← 프로젝트 목록으로</a>
  <a class="btn" href="https://github.com/KimJinsun610/Project_BBB" target="_blank" rel="noopener noreferrer">전체 코드 보기</a>
</div>

<nav class="floating-toc" id="floatingToc" aria-label="Project BBB 상세 목차">
  <p class="ftoc-title">문제 해결 사례</p>
  <ol>
    <li><a href="#death-commit">사망 처리·재화 커밋</a></li>
    <li><a href="#physics-location">물리 전환 위치 보정</a></li>
    <li><a href="#inventory-refresh">인벤토리 갱신 누락</a></li>
    <li><a href="#hot-reload">Hot Reload 참조 깨짐</a></li>
    <li><a href="#supporting-work">보조 구현</a></li>
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

[src-player]: https://github.com/KimJinsun610/Project_BBB/blob/baf18bf6b434ee08d8bcd589c7137185ea525e1c/Project_BBB/Source/Project_BBB/Character/BBBCharacterPlayer.cpp
[src-gamemode]: https://github.com/KimJinsun610/Project_BBB/blob/baf18bf6b434ee08d8bcd589c7137185ea525e1c/Project_BBB/Source/Project_BBB/Game/BBBGameModeBase.cpp
[src-apple]: https://github.com/KimJinsun610/Project_BBB/blob/baf18bf6b434ee08d8bcd589c7137185ea525e1c/Project_BBB/Source/Project_BBB/InteractiveObject/BBBAppleOnTree.cpp
[src-pc]: https://github.com/KimJinsun610/Project_BBB/blob/baf18bf6b434ee08d8bcd589c7137185ea525e1c/Project_BBB/Source/Project_BBB/Player/BBBPlayerController.cpp
[src-weapon]: https://github.com/KimJinsun610/Project_BBB/blob/baf18bf6b434ee08d8bcd589c7137185ea525e1c/Project_BBB/Source/Project_BBB/Combat/BBBWeaponBase.h
