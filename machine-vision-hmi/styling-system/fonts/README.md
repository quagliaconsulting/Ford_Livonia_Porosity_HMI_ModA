# Fonts Directory

This directory is used for local font files if you prefer to self-host fonts instead of using web imports.

## Default Web Font

By default, the styling system uses the Inter font family imported from:
```css
@import url("https://rsms.me/inter/inter.css");
```

## Self-Hosting Fonts

To self-host fonts instead of using web imports:

1. Download the font files (woff2, woff, etc.) and place them in this directory
2. Update the `base.css` file to use the local font files:

```css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  src: url('../fonts/Inter-Regular.woff2') format('woff2'),
       url('../fonts/Inter-Regular.woff') format('woff');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  src: url('../fonts/Inter-Medium.woff2') format('woff2'),
       url('../fonts/Inter-Medium.woff') format('woff');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  src: url('../fonts/Inter-Bold.woff2') format('woff2'),
       url('../fonts/Inter-Bold.woff') format('woff');
}
```

3. Remove or comment out the web import from the `base.css` file. 