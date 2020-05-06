#!/bin/bash
# This script will clone the Google fonts repo and then set up the folder structure to match what the MemeDown loadfonts() method uses to process

git clone https://github.com/google/fonts.git
pushd fonts

rm -f *
rm -f .*
rm -rf .ci
rm -rf catalog
rm -rf .git

for CATEGORY in apache ofl ufl
do 
    mv $CATEGORY/* .
    rm -rf $CATEGORY
done

for FONT in changa comfortaa dancingscript dosis ebgaramond elmessiri exo exo2 faustina firacode inconsolata josefinsans jost karla kreon lemonada lora manrope manuale mavenpro mohave muli orbitron oswald playfairdisplay podkova publicsans quicksand roboto robotoslab rokkitt rosario ruda spartan worksans yanonekaffeesatz
do
    mv ./$FONT/static/*.ttf ./$FONT/
done

popd
