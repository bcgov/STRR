import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: ['*.{html,ts,js,vue}'],
  theme: {
    screens: {
      d: { min: '1263px' },
      m: { max: '1263px' },
      desktop: { min: '1263px' },
      mobile: { max: '1262px' }
    },
    extend: {
      height: {
        bcrosRow: '46px'
      },
      maxWidth: {
        bcrosmd: '1020px',
        bcroslg: '1360px'
      },
      width: {
        bcrosmd: '1020px',
        bcroslg: '1360px'
      },
      screens: {
        // => @media (min-width: 1020px) { ... }
        bcrosmd: '1020px',
        bcroslg: '1360px'
      },
      colors: {
        bcGovColor: {
          // these colors are as defined in styleguide:
          // https://preview.uxpin.com/73eb31e6346bc2863a066f02218a3af289325619#/pages/138840439/simulate/sitemap?mode=i
          // for more details see previous link
          // last updated on (2023-10-16)
          // PRIMARY COLOURS
          footer: '#003366',
          header: '#003366',
          navDivider: '#FCBA19',
          // LINK COLOURS
          activeBlue: '#1669BB',
          // TEXT/NON-CLICKABLE COLOURS
          darkGray: '#212529',
          midGray: '#495057',
          lightGray: '#757575',
          nonClickable: '#38598A',
          // BACKGROUND COLOURS
          white: '#FFFFFF',
          gray1: '#F1F3F5',
          gray2: '#E2E8EE',
          lightBlue: '#E4EDF7',
          // LINES
          hairlinesOnWhite: '#DEE2E6',
          specialtyDottedLines: '#899EB2',
          formFieldLines: '#6F7780',
          // RESULT COLOURS
          caution: '#F8661A', // use on Caution Icon or Large 19px bold+ text only (on white backgrounds only). Not for small text.
          error: '#d3272c' // ok for error text or icons)

        },
        outcomes: {
          approved: '#2E8540',
          error: '#D3272C',
          caution: '#F8661A' // caution icon or large text
        },
        // aka "gray"... nuxt-ui renames gray to cool
        // due to the fact that it is using gray itself
        // so, we need to set bcGray and apply it to the gray in nuxt-ui
        bcGovGray: {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#868e96',
          700: '#495057',
          800: '#343a40',
          900: '#212529'
        },
        yellow: {
          50: '#fff8e3',
          500: '#FCBA19'
        },
        blue: {
          50: '#e0e7ed',
          100: '#b3c2d1',
          200: '#8099b3',
          300: '#4d7094',
          350: '#38598a',
          400: '#26527d',
          500: '#1669bb', // '#003366',
          550: '#003366',
          600: '#002e5e',
          700: '#002753',
          800: '#002049',
          900: '#001438'
        },
        green: {
          // generated on http://mcg.mbitson.com/#!?mcgpalette0=%232e8540 using #2E8540 as base
          50: '#E6F0E8',
          100: '#C0DAC6',
          200: '#97C2A0',
          300: '#6DAA79',
          400: '#4D975D',
          500: '#2E8540',
          600: '#297D3A',
          700: '#237232',
          800: '#1D682A',
          900: '#12551C',
          A100: '#8EFF9D',
          A200: '#5BFF70',
          A400: '#28FF44',
          A700: '#0EFF2E'
        },
        red: {
          // generated on http://mcg.mbitson.com/#!?mcgpalette0=%232e8540 using #D3272C as base
          50: '#FAE5E6',
          100: '#F2BEC0',
          200: '#E99396',
          300: '#E0686B',
          400: '#DA474C',
          500: '#D3272C',
          600: '#CE2327',
          700: '#C81D21',
          800: '#C2171B',
          900: '#B70E10',
          A100: '#FFE5E5',
          A200: '#FFB2B3',
          A400: '#FF7F80',
          A700: '#FF6567'
        },
        orange: {
          // generated on http://mcg.mbitson.com/#!?mcgpalette0=%232e8540 using #F8661A as base
          50: '#FEEDE4',
          100: '#FDD1BA',
          200: '#FCB38D',
          300: '#FA945F',
          400: '#F97D3C',
          500: '#F8661A',
          600: '#F75E17',
          700: '#F65313',
          800: '#F5490F',
          900: '#F33808',
          A100: '#FFFFFF',
          A200: '#FFECE8',
          A400: '#FFC1B5',
          A700: '#FFAB9C'
        }
      }
    }
  }
}
