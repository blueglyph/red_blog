# Red's blog

This is the source repo for the blog and its content. Feel free to fork the code or copy parts of it. I would only ask you to change the theme to make it look different if you intend to use it publicly.

The blog is generated with Zola; for now it's done manually since I'm checking the result anyway. The built website is updated in `docs/` when it's ready to be published.

The code and theme are home-made. It's very basic and should be fine on handheld devices, though it was done for 1080p monitors or larger.

## To-do list

- [x] ~~check handheld device compatibility~~
- [x] ~~add utterances script for comments~~
- [x] ~~fix dark code theme~~
- [x] ~~favicon~~
- [ ] light / dark theme switch, script
  - [ ] add a "system preference" option
- [ ] 2-stage collapse of nav and TOC panels
- [x] ~~move the tags elsewhere when this panel is collapsed~~
- [ ] search
- [ ] add a clipboard copy button for code
- [ ] feeds

## External components

- The SSG is Zola - I started using version 0.17.2, that I modified locally to fix the Rust parser (a git module to https://github.com/sublimehq/Packages.git).
- Two Google fonts are used for the text and the code; for now they're loaded from their website:
  - [Titillium Web](https://fonts.google.com/specimen/Titillium+Web)
  - [Inconsolata](https://fonts.google.com/specimen/Inconsolata)
- [utterances](https://utteranc.es/) for the comments

