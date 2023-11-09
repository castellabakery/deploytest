#!/bin/bash

version="0.1.2"
registry="localhost:32500"
imageName="deploytest"
tarName="deploytest.tar"
buildPath="/build/deploytest"

sudo docker build -t $registry/$imageName:$version $buildPath
sudo docker save -o $buildPath/$tarName $registry/$imageName:$version
sudo ctr i rm $registry/$imageName:$version
sudo ctr i import $buildPath/$tarName
sudo ctr i push $registry/$imageName:$version

sudo rm -rf $buildPath/*