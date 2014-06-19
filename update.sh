#!/bin/bash

echo `date`
rm -rf _site/*
jekyll build

git add --all ./*
git commit -m "updating blog"
git push origin master

rm -rf ../javachen.gitcafe.com/*
cp -r _site/* ../javachen.gitcafe.com/

cd ../javachen.gitcafe.com
git add --all ./*
git commit -m "updating blog"
git push origin gitcafe-pages

echo `date`
exit 0
