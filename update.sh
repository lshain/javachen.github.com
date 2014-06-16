#!/bin/bash

jekyll build

git add ./*
git commit -a -m "updating blog"
gpm

rm -rf ../javachen.gitcafe.com/*
cp -ar _site/* ../javachen.gitcafe.com

cd ../javachen.gitcafe.com
git add ./*
git commit -a -m "updating blog"
gpg

exit 0