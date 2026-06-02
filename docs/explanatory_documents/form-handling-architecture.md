# Form Handling & Validation Architecture

A technical deep-dive into how forms, client validation, and server-action synchronization are designed in LexiFlix (`apps/web`). This document serves as the reference for code reviews covering authentication, user settings, and feature-level form handling.

---

## 1. Executive Summary & Design Goals

Form management in modern Next.js applications often degenerates into one of two extremes:
- **Over-abstraction:** Monolithic form providers, heavy form wrappers, and state management libraries that re-render whole component trees on every keystroke.
- **Under-abstraction:** Ad-hoc `useState` per field, manual string sanitization scattered across handlers, and loose alignment with server-side validation logic.

In LexiFlix, our form handling architecture balances **uncontrolled performance**, **end-to-end type safety**, and **isolated component boundaries**:

| Concern | Architectural Choice | Primary Benefit |
|---|---|---|
| **Validation Engine** | Zod + `@hookform/resolvers/zod` | Single source of truth for runtime validation and static TS types. |
| **State Ownership** | React Hook Form (RHF) | Ref-based uncontrolled inputs; zero re-renders on keystroke. |
| **Controlled Primitives** | Radix UI via RHF `<Controller />` | Bridges accessible Select, Switch, and Checkbox UI primitives cleanly. |
| **Scope & Boundaries** | Card-Isolated Forms | Keeps dirty state, field errors, and submit transitions local to each card. |
| **Server Synchronization** | `ActionResult<T>` + `reset(canonicalData)` | Resets form state with canonical server response upon save to sync `isDirty`. |
| **Non-Serializable State** | Hybrid React `useState` | Keeps `File` uploads and `blob:` preview URLs in native React lifecycle. |

---

## 2. Foundations of React Hook Form

React Hook Form (RHF) treats HTML inputs as uncontrolled elements backed by DOM refs. Instead of binding `value` and `onChange` to top-level React state, RHF subscribes to DOM events only when necessary.

### 2.1 Uncontrolled Inputs & Ref Subscriptions (`register`)

The primary integration mechanism is `register()`. It returns a set of DOM properties (`name`, `ref`, `onChange`, `onBlur`) that bind the input to RHF's internal store without causing component re-renders during typing.

```tsx
// Example from sign-form.tsx
<Input
  id="email"
  type="email"
  placeholder="you@example.com"
  className="h-11 pl-10 text-sm font-medium"
  aria-invalid={!!errors.email}
  {...register("email")}
/>
```

When the user types, the DOM handles the input state natively. RHF reads the value on submit or during validation passes.

---

### 2.2 Schema Resolution with Zod (`zodResolver`)

Instead of writing manual validation functions inside components, we pair RHF with Zod schemas using `@hookform/resolvers/zod`.

```ts
// Defined in apps/web/src/features/auth/types.ts
import { z } from "zod";

export const SignInSchema = z.object({
  email: z.string().min(1, "Email is required.").email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});

export type SignInInput = z.infer<typeof SignInSchema>;
```

Inside the form component:

```tsx
// Inside LoginForm (sign-form.tsx)
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
  setError,
} = useForm<SignInInput>({
  resolver: zodResolver(SignInSchema),
  mode: "onChange",
});
```

* **Validation Mode (`mode: "onChange"`):** Evaluates Zod constraints as the user interacts with the input, yielding instant feedback for fields with invalid formats.
* **Single Source of Truth:** `SignInInput` is derived directly via `z.infer<typeof SignInSchema>`, ensuring form input types and validation rules never drift apart.

---

### 2.3 Controlled UI Primitives via `<Controller />`

Radix UI components (such as `Select`, `Switch`, and `Checkbox`) do not expose standard HTML `<input>` refs. To manage these controlled components within RHF without breaking dirty tracking, we use RHF's `<Controller />`.

```tsx
// Example from preferences-settings-card.tsx
<Controller
  control={control}
  name="generationCefrWindowMode"
  render={({ field }) => (
    <Select
      value={field.value}
      onValueChange={(val) => {
        field.onChange(val);
        setPreferencesStatus(null);
      }}
    >
      <SelectTrigger id="generation-cefr-window" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="same_level">Keep at my current level</SelectItem>
        <SelectItem value="one_level_above">One level above</SelectItem>
        <SelectItem value="all_levels_above">All levels above</SelectItem>
      </SelectContent>
    </Select>
  )}
/>
```

* **`field.value` & `field.onChange`:** Provides the controlled value to Radix and notifies RHF when the user selects a new option.
* **Dirty Tracking:** Automatically marks `formState.isDirty` as `true` when the selected value differs from the initial value.

---

## 3. LexiFlix Form Architecture Patterns

### 3.1 Co-Located Zod Schemas & Types

In feature modules (`features/auth/types.ts`, `features/settings/types.ts`), client-safe Zod schemas and inferred types live together in `types.ts`:

```ts
// apps/web/src/features/settings/types.ts
export const passwordSettingsSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type PasswordSettingsInput = z.infer<typeof passwordSettingsSchema>;
```

**Why this matters for Code Review:**
- Eliminates duplicate interface declarations.
- Prevents importing server-only modules on the client side.
- Ensures client validation and server action parameter types match 1:1.

---

### 3.2 Modular Card-Level Form Isolation

Rather than wrapping the entire `SettingsClient` page in a single giant `<form>` or `<FormProvider>`, each settings card encapsulates its own independent form instance:

```tsx
// settings-client.tsx
<TabsContent value="account" className="mt-0">
  <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
    <div className="flex flex-col gap-4">
      <ProfileSettingsCard user={user} />
      <PasswordSettingsCard />
    </div>

    <div className="flex flex-col gap-4">
      <DeleteAccountCard
        deleteStatus={deleteStatus}
        isDeletingAccount={isDeletingAccount}
        handleDeleteAccount={handleDeleteAccount}
      />
    </div>
  </div>
</TabsContent>
```

**Benefits of Card Isolation:**
1. **Targeted Submissions:** Updating a password does not submit or validate display name or preferences.
2. **Local Dirty State:** Saving preferences enables the submit button *only* on the preferences card.
3. **Reduced Blast Radius:** An error in one form card cannot stall or break adjacent cards.

---

### 3.3 Hybrid State Model (RHF + Native React State)

Certain browser features—specifically image `File` uploads and dynamic `blob:` preview URLs—cannot be reliably tracked by RHF's primitive dirty-checking algorithm.

In `ProfileSettingsCard`, we use a **hybrid pattern**: RHF manages the `displayName` text field, while standard React state manages file selection and URL cleanup.

```tsx
// profile-settings-card.tsx
export function ProfileSettingsCard({ user }: ProfileSettingsCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<StatusState>(null);
  const [isSaving, startTransition] = useTransition();

  const [initialProfile, setInitialProfile] = useState(() => ({
    name: user.name,
    avatar: user.image ?? null,
  }));

  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialProfile.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  // RHF manages display name text field validation
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProfileSettingsInput>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: { displayName: user.name },
  });

  const displayName = watch("displayName");

  // Revoke object URLs on unmount/change to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // Composite dirty calculation combining text RHF state & native file state
  const nameChanged = displayName.trim() !== initialProfile.name;
  const avatarChanged = removeAvatar || avatarFile !== null || avatarPreview !== initialProfile.avatar;
  const hasChanges = nameChanged || avatarChanged;

  const onSubmit = (data: ProfileSettingsInput) => {
    setStatus(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("name", data.displayName.trim());
        if (removeAvatar) formData.append("removeAvatar", "true");
        if (avatarFile) formData.append("avatar", avatarFile);

        const result = await updateProfileAction(formData);
        if (result.ok) {
          const updatedUser = result.data.user;
          setInitialProfile({ name: updatedUser.name, avatar: updatedUser.image });
          setAvatarPreview(updatedUser.image);
          setAvatarFile(null);
          setRemoveAvatar(false);

          reset({ displayName: updatedUser.name });
          setStatus({ type: "success", message: "Profile updated successfully." });
          toast.success("Profile updated successfully.");
        } else {
          setStatus({ type: "error", message: result.error || "Failed to update profile." });
        }
      } catch (err) {
        setStatus({ type: "error", message: "Failed to update profile." });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="contents">
      {/* ... Card Content ... */}
      <Button type="submit" disabled={isSaving || !hasChanges}>
        {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : "Save profile"}
      </Button>
    </form>
  );
}
```

---

### 3.4 Server Action Integration & Canonical State Reset

When a Server Action completes successfully, calling `reset(canonicalServerResponse)` updates RHF's baseline values to match the newly saved database record. This immediately sets `formState.isDirty` back to `false` and disables the save button.

```ts
// Inside use-preferences-form.ts
const result = await updateSettingsPreferencesAction(payload);

if (result.ok) {
  const next = result.data.preferences;
  setInitialPreferences(next);

  // Sync RHF baseline with canonical server response
  reset({
    manualOverrideSelection: next.manualOverrideLevel ?? "assessed",
    newCardsPerDay: next.newCardsPerDay,
    frequencyPreference: next.frequencyPreference,
    studyVocabularyTypes: next.studyVocabularyTypes,
    generationPackSizeDefault: next.generationPackSizeDefault,
    generationCefrWindowMode: next.generationCefrWindowMode,
    generationKnownTermHandling: next.generationKnownTermHandling,
    generationAudioVoiceGenderDefault: next.generationAudioVoiceGenderDefault,
    generationExampleSentenceCount: next.generationExampleSentenceCount,
    generationCustomInstructionsDefault: next.generationCustomInstructionsDefault ?? "",
    emailRemindersEnabled: next.emailRemindersEnabled,
    streakAlertsEnabled: next.streakAlertsEnabled,
  });

  setStatus({ type: "success", message: "Preferences updated successfully." });
  toast.success("Preferences updated");
  router.refresh();
}
```

---

### 3.5 Type Conversions & Selection Utilities

#### Numeric Coercion (`valueAsNumber`)
Native `<input type="number">` elements return string values in browser DOM events. Using `{ valueAsNumber: true }` in `register()` forces RHF to store numeric values in its internal form state:

```tsx
<Input
  id="new-cards-per-day"
  type="number"
  min={1}
  max={100}
  {...register("newCardsPerDay", {
    valueAsNumber: true,
    onChange: () => setPreferencesStatus(null),
  })}
/>
```

#### Radix `Select` String-to-Number Marshalling
Radix UI `Select` components operate exclusively on string values. For fields backed by numeric literal union types (e.g. `generationExampleSentenceCount: 1 | 2 | 3`), the `Controller` stringifies values on the way in and converts them back to numbers on change:

```tsx
<Controller
  control={control}
  name="generationExampleSentenceCount"
  render={({ field }) => (
    <Select
      value={String(field.value)}
      onValueChange={(val) => {
        field.onChange(Number(val));
        setPreferencesStatus(null);
      }}
    >
      <SelectTrigger id="generation-example-count" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">1 sentence</SelectItem>
        <SelectItem value="2">2 sentences</SelectItem>
        <SelectItem value="3">3 sentences</SelectItem>
      </SelectContent>
    </Select>
  )}
/>
```

---

## 4. Code Review Checklist for Forms

When reviewing new or updated forms in LexiFlix, verify the following checklist:

- [ ] **Schema Co-location:** Is the Zod schema exported from a client-safe `types.ts` file?
- [ ] **Inferred Types:** Is the form type derived using `z.infer<typeof schema>` rather than hand-written TypeScript interfaces?
- [ ] **Input Registration:** Are native inputs bound via `{...register("fieldName")}`?
- [ ] **Controlled Components:** Are Radix UI inputs bound via `<Controller />`?
- [ ] **Number Coercion:** Do number inputs use `valueAsNumber: true` or explicit type converters?
- [ ] **Memory Safety:** Are `blob:` preview URLs created with `URL.createObjectURL` cleaned up via `URL.revokeObjectURL` in `useEffect` cleanup return handlers?
- [ ] **Dirty State Button Gating:** Is the submit button disabled when `!formState.isDirty` (or `!hasChanges`)?
- [ ] **Canonical Reset:** Is `reset(result.data)` called on Server Action success to synchronize baseline state?
- [ ] **Card Isolation:** Is the form contained within its own dedicated component card rather than a global page-level form context?

---

## 5. Summary

LexiFlix form handling relies on a small set of explicit, repeatable patterns:

1. **Zod schemas in `types.ts` are the single source of truth** for runtime validation and static TS types.
2. **React Hook Form owns text and select state** via uncontrolled ref subscriptions and `<Controller />` wrappers.
3. **Native React state owns browser lifecycle objects** (`File` instances and `blob:` object URLs) with explicit cleanup.
4. **Server Actions execute inside `useTransition`**, returning discriminated `ActionResult<T>` responses.
5. **Form baseline state is reset with canonical server data** upon save, ensuring `isDirty` and button states accurately reflect database persistence.
