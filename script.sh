#!/bin/bash
#Script is for setting up fonts directory after cloning the Google fonts repo https://github.com/google/fonts.git
#You need to be within the fonts directory and call this from there.
#For some reason this wasn't working on multiple lines and I was too lazy to figure out why :(
rm -f *;rm -f .*;rm -rf .ci;rm -rf catalog;rm -rf .git;for CATEGORY in apache ofl ufl;do mv $CATEGORY/* .;rm -rf $CATEGORY;done;for FONT in changa comfortaa dancingscript dosis ebgaramond elmessiri exo exo2 faustina firacode inconsolata josefinsans jost karla kreon lemonada lora manrope manuale mavenpro mohave muli orbitron oswald playfairdisplay podkova publicsans quicksand roboto robotoslab rokkitt rosario ruda spartan worksans yanonekaffeesatz; do mv ./$FONT/static/*.ttf ./$FONT/; done