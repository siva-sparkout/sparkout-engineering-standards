---
name: flutter-standard
description: Use when writing, reviewing, or modifying Flutter or Dart code. Enforces the Mobile (Flutter) Coding Standard v2.0 — async safety, widget architecture, secure storage, theme tokens, money handling, offline and lifecycle behaviour.
---

# Mobile (Flutter) Standard

Apply to **new and changed code**. Do not retrofit existing code unless asked.
Flutter · Dart · BLoC · Android and iOS.

## Never

- Touch a widget or `BuildContext` after an `await` without checking `mounted` / `context.mounted`. The user may have left the screen; using a disposed context throws.
- `emit` after an `await` in a BLoC without checking `isClosed` and `emit.isDone`. Emitting after close throws and takes the screen with it.
- A controller, subscription, timer or animation created by a widget and not disposed.
- A network call without a timeout. It hangs until the user force-quits.
- A write action that can be tapped twice. Disable the control while the request is in flight — a second tap on a payment is not a harmless retry.
- Start a request, change state, or do expensive work inside `build()`. It runs on every rebuild.
- A server secret, API key or private key in the app. **`--dart-define`, bundled `.env` files and obfuscation do not hide a value** — an APK or IPA unpacks and the strings read in minutes.
- Credentials in `SharedPreferences`. It is a plain file, readable on a rooted or jailbroken device.
- `double` for money.
- `print()`, `debugPrint()` or `dart:developer` logging in app code.
- An unchecked `!` on data from outside the app — an API response, a deep link, storage.
- An empty `catch`, or a `catch` that logs and continues.
- A `Column` inside a `SingleChildScrollView` for a long list. It builds every row whether visible or not.
- A raw colour, spacing or text style in a widget. Use theme tokens.
- `setState` in a widget that has a BLoC for the same state. One owner per piece of state.
- Business logic in a widget. Widgets render; BLoCs and services decide.
- Disabling a lint rule or a test to get CI green.

## Always

- Feature-first: `lib/features/<name>/{presentation,domain,data}` plus `lib/core/`.
- Layer a feature when it earns it. A screen reading one endpoint does not need an abstract repository and a use-case class per action.
- `const` constructors wherever possible — a `const` widget is not rebuilt.
- `ListView.builder` or a sliver for long lists; a stable `Key` on stateful list items.
- Four states on every screen that loads data: **loading, empty, error, success**.
- Credentials in platform-backed secure storage (Keychain / Keystore), cleared on logout.
- Correlation id sent as `X-Correlation-Id`, shown on the error state.
- Both Android and iOS checked before raising the PR for anything touching a native flow.

## Patterns to copy

**Async safety — the rules that prevent crashes.**

```dart
// ❌ crashes if the user navigates away during the request
Future<void> _submit() async {
  final result = await repository.settle(loanId);
  Navigator.of(context).pop(result);
}

// ✅
Future<void> _submit() async {
  final result = await repository.settle(loanId);
  if (!context.mounted) return;
  Navigator.of(context).pop(result);
}
```

```dart
Future<void> _onSettle(SettleLoan event, Emitter<LoanState> emit) async {
  emit(const LoanState.loading());
  try {
    final loan = await _repository.settle(event.id);
    if (isClosed || emit.isDone) return;
    emit(LoanState.ready(loan));
  } on AppException catch (e) {
    if (isClosed || emit.isDone) return;
    emit(LoanState.error(userMessage(e), e.correlationId));
  }
}
```

**Secrets — the app binary is public.** When a feature needs a third-party key, the app calls our backend and our backend calls the third party. If vendor documentation shows a mobile-side key, that key is either publishable by design or the docs are showing a prototype. If you are unsure which you are holding, you are holding a secret.

**Design tokens via `ThemeExtension`.** A rebrand, dark mode or a white-label build should touch one file.

```dart
extension AppTokensX on BuildContext {
  AppTokens get tokens => Theme.of(this).extension<AppTokens>()!;
}

Container(                                              // ✅
  padding: EdgeInsets.all(context.tokens.space4),
  decoration: BoxDecoration(color: context.tokens.surface),
)

Container(padding: const EdgeInsets.all(13), color: const Color(0xFFFFFFFF))   // ❌
```

**Three kinds of widget.** A presentational widget that reads a BLoC or calls a repository cannot be reused, tested in isolation, or survive a redesign that moves it to another screen.

| Kind | May use |
|---|---|
| Screen | BLoC, navigation |
| Feature widget | Nothing — typed constructor parameters only |
| Presentational | Nothing — renders what it is given |

A widget never sets its own outer margin. The parent owns spacing.

## Money

`double` never touches an amount.

| Kind | Type |
|---|---|
| Fiat | `int` minor units, received and sent as `String` |
| Token | `BigInt` base units, as `String` |
| Rates | integer basis points |

Parse from the JSON **string**, never a JSON number — above 2^53 precision is lost silently, and on Flutter web `int` is a JS number so the loss is real. Totals, fees and interest come from the backend; the app displays what it is given. **The app version cannot be hot-fixed**, so a formula duplicated in the app is a formula that will disagree with the backend in a shipped binary.

## Platform

- Sensitive screens block screenshots and screen recording, and are hidden from the app-switcher snapshot.
- Deep links carry a destination, never an instruction or an authorisation. Verify server-side before acting.
- Permissions requested at the point of use with a plain explanation, never all at launch. On iOS a denial is sticky.
- Poor connectivity is a normal operating condition. Offline gets a message and a retry, not a spinner that never resolves. A queued write that has not been sent is shown as pending, never as done.
- Text scales with the system setting. Test at the largest setting — a fixed-height container around text will overflow.
- Touch targets at least 48dp; `Semantics` labels on icon-only controls.

## Before you finish

1. `mounted` / `context.mounted` checked after every `await`.
2. `isClosed` / `emit.isDone` checked before emitting after an `await`.
3. Controllers, subscriptions and timers disposed.
4. Double submission prevented; every network call has a timeout.
5. No `double` near an amount; parsed from a string.
6. Nothing sensitive in `SharedPreferences`, logs or crash reports.
7. No work started inside `build()`; `const` used where possible.
8. Both platforms checked for the affected flow.

Full reasoning and the complete rule set: **Mobile (Flutter) Coding Standard v2.0**.
