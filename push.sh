#!/bin/bash

git config --global user.email "travis@travis-ci.org"
git config --global user.name "Travis CI"
git checkout --orphan gh-pages
shopt -s extglob
cp ads.txt build/
rm -rf !(build) && mv build/* . && rm -rf build
touch .nojekyll
git config credential.helper "store --file=.git/credentials"
echo "https://${GH_TOKEN}:@github.com" > .git/credentials
git add .
git commit --message "Travis build: $TRAVIS_BUILD_NUMBER"
git push origin gh-pages -f
git push -f --mirror https://elf_gzp:${GITEE_TOKEN}@gitee.com/elf_gzp/elfgzp.cn.git
