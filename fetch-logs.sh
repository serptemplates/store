#!/bin/sh
export PATH="/opt/homebrew/bin:$PATH"
vercel logs apps.serp.co --scope serpcompany --since 30m
