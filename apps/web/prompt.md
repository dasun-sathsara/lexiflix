-   Use the following set of gradient effects for the card backgrounds.

```tsx
<div className="min-h-screen w-full bg-black relative">
    {/* Midnight Mist */}
    <div
        className="absolute inset-0 z-0"
        style={{
            backgroundImage: `
          radial-gradient(circle at 50% 100%, rgba(70, 85, 110, 0.5) 0%, transparent 60%),
          radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.4) 0%, transparent 70%),
          radial-gradient(circle at 50% 100%, rgba(181, 184, 208, 0.3) 0%, transparent 80%)
        `,
        }}
    />
    {/* Your Content/Components */}
</div>
```

```tsx
<div className="min-h-screen w-full bg-black relative">
    {/* Deep Ocean Glow */}
    <div
        className="absolute inset-0 z-0"
        style={{
            background:
                'radial-gradient(70% 55% at 50% 50%, #2a5d77 0%, #184058 18%, #0f2a43 34%, #0a1b30 50%, #071226 66%, #040d1c 80%, #020814 92%, #01040d 97%, #000309 100%), radial-gradient(160% 130% at 10% 10%, rgba(0,0,0,0) 38%, #000309 76%, #000208 100%), radial-gradient(160% 130% at 90% 90%, rgba(0,0,0,0) 38%, #000309 76%, #000208 100%)',
        }}
    />
    {/* Your Content/Components */}
</div>
```

```tsx
<div className="min-h-screen w-full bg-black relative">
    {/* Aurora Mystic Mist Background */}
    <div
        className="absolute inset-0 z-0"
        style={{
            backgroundImage: `
          radial-gradient(circle at 50% 100%, rgba(58, 175, 169, 0.6) 0%, transparent 60%),
          radial-gradient(circle at 50% 100%, rgba(255, 140, 0, 0.4) 0%, transparent 70%),
          radial-gradient(circle at 50% 100%, rgba(238, 130, 238, 0.3) 0%, transparent 80%)
        `,
        }}
    />
    {/* Your Content/Components */}
</div>
```

```tsx
<div className="min-h-screen w-full bg-black relative">
    {/* Crimson Core Glow */}
    <div
        className="absolute inset-0 z-0"
        style={{
            background:
                'linear-gradient(0deg, rgba(0,0,0,0.6), rgba(0,0,0,0.6)), radial-gradient(68% 58% at 50% 50%, #c81e3a 0%, #a51d35 16%, #7d1a2f 32%, #591828 46%, #3c1722 60%, #2a151d 72%, #1f1317 84%, #141013 94%, #0a0a0a 100%), radial-gradient(90% 75% at 50% 50%, rgba(228,42,66,0.06) 0%, rgba(228,42,66,0) 55%), radial-gradient(150% 120% at 8% 8%, rgba(0,0,0,0) 42%, #0b0a0a 82%, #070707 100%), radial-gradient(150% 120% at 92% 92%, rgba(0,0,0,0) 42%, #0b0a0a 82%, #070707 100%), radial-gradient(60% 50% at 50% 60%, rgba(240,60,80,0.06), rgba(0,0,0,0) 60%), #050505',
        }}
    />
    {/* Soft vignette to blend edges */}
    <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)',
            opacity: 0.95,
        }}
    />
    {/* Your Content/Components */}
</div>
```
