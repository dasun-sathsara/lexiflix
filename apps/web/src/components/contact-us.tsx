import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export function ContactUsSection() {
    return (
        <section
            id="contact"
            className="relative px-6 py-16 sm:py-20"
            aria-labelledby="contact-heading"
        >
            <div className="mx-auto max-w-6xl rounded-[2.25rem] px-8 py-12 sm:px-10 lg:px-14">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)]">
                    <div className="space-y-6">
                        <span className="inline-flex items-center gap-2 rounded-full border border-purple-200/60 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-purple-600 shadow-sm backdrop-blur dark:border-purple-900/40 dark:bg-slate-950/50 dark:text-purple-200">
                            Contact
                        </span>
                        <h2
                            id="contact-heading"
                            className="text-balance text-3xl font-semibold sm:text-4xl"
                        >
                            Let's build your next breakthrough learning session
                        </h2>
                        <p className="text-balance text-base text-muted-foreground sm:text-lg">
                            Have a feature request, partnership idea, or just want to say hi?
                            Drop us a note and our team will respond within one business day.
                        </p>
                        <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
                            <div className="relative overflow-hidden rounded-2xl border border-purple-200/60 p-4 dark:border-purple-900/50">
                                <GlowingEffect
                                    blur={6}
                                    borderWidth={1}
                                    spread={36}
                                    proximity={42}
                                    inactiveZone={0.18}
                                    className="opacity-20"
                                    glow
                                    disabled={false}
                                />
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500 dark:text-purple-300">
                                    Prefer email?
                                </p>
                                <a
                                    href="mailto:hello@lexiflix.app"
                                    className="mt-2 inline-flex items-center text-base font-medium text-foreground hover:underline"
                                >
                                    hello@lexiflix.app
                                </a>
                            </div>
                            <div className="relative overflow-hidden rounded-2xl border border-purple-200/60 p-4 dark:border-purple-900/50">
                                <GlowingEffect
                                    blur={6}
                                    borderWidth={1}
                                    spread={36}
                                    proximity={42}
                                    inactiveZone={0.18}
                                    className="opacity-20"
                                    glow
                                    disabled={false}
                                />
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500 dark:text-purple-300">
                                    Response time
                                </p>
                                <p className="mt-2 text-base text-foreground">
                                    Weekdays · 9am – 6pm PT
                                </p>
                            </div>
                        </div>
                    </div>
                    <Card className="relative overflow-hidden border border-purple-200/60 bg-transparent shadow-none dark:border-purple-900/40">
                        <GlowingEffect
                            blur={8}
                            borderWidth={1}
                            spread={42}
                            proximity={48}
                            inactiveZone={0.15}
                            className="opacity-20"
                            glow
                            disabled={false}
                        />
                        <CardHeader className="relative pb-4">
                            <CardTitle className="text-xl font-semibold">
                                Send us a message
                            </CardTitle>
                            <CardDescription>
                                Fill out the form and we'll follow up with tailored resources or a quick demo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="relative">
                            <form className="space-y-5" noValidate>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="contact-name">Name</Label>
                                        <Input
                                            id="contact-name"
                                            name="name"
                                            placeholder="Ada Lovelace"
                                            autoComplete="name"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contact-email">Email</Label>
                                        <Input
                                            id="contact-email"
                                            type="email"
                                            name="email"
                                            placeholder="you@example.com"
                                            autoComplete="email"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-subject">Subject</Label>
                                    <Input
                                        id="contact-subject"
                                        name="subject"
                                        placeholder="Let's collaborate on..."
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-message">Message</Label>
                                    <Textarea
                                        id="contact-message"
                                        name="message"
                                        placeholder="Share your ideas, requests, or questions."
                                        rows={5}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        We'll never share your info. Expect a reply within 24 hours.
                                    </p>
                                    <Button type="submit" size="lg" className="w-full sm:w-auto">
                                        Submit
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
}
