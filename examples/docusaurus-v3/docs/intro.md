---
id: intro
title: Plugin omg demo
sidebar_position: 1
---

import OmgStatus from '@theme/OmgStatus';
import OmgWeblogLatest from '@theme/OmgWeblogLatest';
import OmgPaste from '@theme/OmgPaste';

# Plugin omg demo

This example site fetches data from omg.lol at build time and renders it inline.

## Latest status

<OmgStatus address="adam" />

## Latest weblog post

<OmgWeblogLatest address="adam" />

## A pinned paste

Add `{ address: 'adam', paste: 'example' }` to the plugin's `pastes` option, then:

<OmgPaste address="adam" paste="example" language="bash" />
