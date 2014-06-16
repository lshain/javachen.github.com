#!/bin/bash

jekyll build

git add --all ./*
git commit -m "updating blog"
git push origin master

rm -rf ../javachen.gitcafe.com/*
cp -ar _site/* ../javachen.gitcafe.com

cd ../javachen.gitcafe.com
git add --all ./*
git commit -m "updating blog"
git push origin gitcafe-page


exit 0