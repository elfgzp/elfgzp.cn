#!/bin/bash
ssh gzp@cloud.elfgzp.cn "cd ~/workspace/elfgzp.cn && source ~/.zshrc  && git config --global user.email '741424975@qq.com' &&
  git config --global user.name 'Gzp_'
  git fetch -a
  git checkout origin/gh-pages
  "
