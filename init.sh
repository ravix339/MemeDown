#!/bin/bash
# This script will clone the Google fonts repo and then set up the folder structure to match what the MemeDown loadfonts() method uses to process

git clone https://github.com/google/fonts.git
pushd fonts

#Remove folders and files in fonts/ that aren't necessarly
rm -f *
rm -f .*
rm -rf .ci
rm -rf catalog
rm -rf .git

#Extract each font folder from the folders
for CATEGORY in apache ofl ufl
do 
    mv $CATEGORY/* .
    rm -rf $CATEGORY
done

#Move the font files that were in the static file to the font family root dir.
for FONT in changa comfortaa dancingscript dosis ebgaramond elmessiri exo exo2 faustina firacode inconsolata josefinsans jost karla kreon lemonada lora manrope manuale mavenpro mohave muli orbitron oswald playfairdisplay podkova publicsans quicksand roboto robotoslab rokkitt rosario ruda spartan worksans yanonekaffeesatz
do
    mv ./$FONT/static/*.ttf ./$FONT/
done

popd
