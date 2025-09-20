"use client";

import { useState, useEffect } from "react";
import NextLink from "next/link";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Type, FileText, Hash, AlignLeft, Space, Copy, Trash2, Download, BarChart3, Sparkles, Clock, Book } from "lucide-react";

interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  readingTime: number;
}

export default function CharacterCounterPage() {
  const [text, setText] = useState('');
  const [stats, setStats] = useState<TextStats>({ characters: 0, charactersNoSpaces: 0, words: 0, sentences: 0, paragraphs: 0, readingTime: 0 });

  useEffect(() => {
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim()).length;
    const readingTime = Math.ceil(words / 200);
    setStats({ characters, charactersNoSpaces, words, sentences, paragraphs, readingTime });
  }, [text]);

  const clearText = () => setText('');
  const copyText = () => { navigator.clipboard.writeText(text); };

  const maxCharacters = 5000;
  const characterProgress = (stats.characters / maxCharacters) * 100;

  return (
    <>
      <SiteNavbar site={{ name: siteConfig.name, categories: siteConfig.categories }} Link={NextLink} brandSrc="/logo.png" />
      <main className="min-h-screen bg-background">
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20" />
            <div className="absolute right-0 top-0 h-72 w-72 bg-blue-400/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-72 w-72 bg-purple-400/10 blur-3xl" />
          </div>
          <div className="container relative py-12">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl">
                <Type className="h-10 w-10 text-white" />
              </div>
              <Badge className="mb-4" variant="secondary"><Sparkles className="mr-1 h-3 w-3" />Real-time Analysis</Badge>
              <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Character Counter</h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">Analyze your text quickly with helpful stats.</p>
            </div>
          </div>
        </section>

        <div className="container py-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Enter Your Text</CardTitle>
                        <CardDescription>Type or paste your text below for instant analysis</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={copyText} disabled={!text}><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={clearText} disabled={!text}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <textarea className="min-h[400px] w-full rounded-lg border bg-background p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Start typing or paste your text here..." value={text} onChange={(e) => setText(e.target.value)} />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Character Limit</span>
                          <span className={stats.characters > maxCharacters ? "text-red-500" : "text-muted-foreground"}>{stats.characters.toLocaleString()} / {maxCharacters.toLocaleString()}</span>
                        </div>
                        <Progress value={characterProgress > 100 ? 100 : characterProgress} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Characters</p>
                        <p className="text-3xl font-bold">{stats.characters.toLocaleString()}</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><Hash className="h-6 w-6 text-primary" /></div>
                    </div>
                  </div>
                </Card>

                <div className="grid gap-4">
                  <Card><CardContent className="flex items-center justify-between p-6"><div><p className="text-sm text-muted-foreground">Characters (no spaces)</p><p className="text-2xl font-semibold">{stats.charactersNoSpaces.toLocaleString()}</p></div><Space className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
                  <Card><CardContent className="flex items-center justify-between p-6"><div><p className="text-sm text-muted-foreground">Words</p><p className="text-2xl font-semibold">{stats.words.toLocaleString()}</p></div><FileText className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
                  <Card><CardContent className="flex items-center justify-between p-6"><div><p className="text-sm text-muted-foreground">Sentences</p><p className="text-2xl font-semibold">{stats.sentences.toLocaleString()}</p></div><AlignLeft className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
                  <Card><CardContent className="flex items-center justify-between p-6"><div><p className="text-sm text-muted-foreground">Paragraphs</p><p className="text-2xl font-semibold">{stats.paragraphs.toLocaleString()}</p></div><Book className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
                  <Card><CardContent className="flex items-center justify-between p-6"><div><p className="text-sm text-muted-foreground">Reading Time</p><p className="text-2xl font-semibold">~{stats.readingTime} min</p></div><Clock className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
