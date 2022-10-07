# Frotend Design System

## Type System

the type system is adjustable with two variables. Like you've seen, font-size sets the medium font size (1rem) and --text-scale-ratio adjusts the difference between text size steps. By keeping these as variables instead of hardcoding all the --text-<size> values in rem units, we ensure that each step is exactly 20% (if --text-scale-ratio equals 1.2) different from the next step. This ensures visual consistency and gives options uniformly along the range of text sizes we want to support. This makes it easy to iterate, add breakpoints, and prevents the situation where one font size is updated but the others are not whether that be in a breakpoint or in the \_typography.scss file. It also isn't much of a limitation at all on the design side of things.

## Spacing System

### Relative Spacing

the spacing system is first specified in em units. This means that it is a multiple of that element's font size. So let's say you have h6 at 1 rem (16px) and want margin-bottom to be 50% of this font size. By setting margin-bottom = 0.5 em (--space-xs) on the element, you accomplish this. When someone introduces a breakpoint later and changes the font, the margin-bottom won't have to be updated because it's specified in em. (So you probably won't have to update these css vars in media query breakpoints.) By creating css variables for these sizes, we constrain the components to use one of these predefined sizes, which again enforces visual consistency and makes the code much more maintainable. Designers can now iterate on the entire app's margins and paddings by tweaking these values.

### Fixed Spacing

The fixed spacing system is intended for margins and paddings that shouldn't change based on the font size of the element. So if you want something to truly be 4px instead of 25% of a 1rem, use this.

## FAQ

#### How do I pick the spacing values?

Ideally there is a figma file that has already designed the component. If not, it will be up to the frontend dev to select a font size or spacing value.

#### How should I handle border-radius?

If you want it to adjust dynamically to font size changes in the element (e.g. when hitting a breakpoint), use --space-X. If you want a constant value in px, use --space-X-fixed.

#### Why should I use a spacing value instead of a text value?

It's important that we keep our design system parameterized and defined in one place for maintainability and ease of iteration by our designers.

#### I can't find the px value I want. Can I hardcode it?

This isn't good practice. It's important to keep our text sizes, margins, and paddings constrained to a small number of choices so that we can provide a visual consistent user experience.

If you truly need a different value, consider changing the --space or --space fixed category value defined in \_spacing.scss. Consult the designers first though.
