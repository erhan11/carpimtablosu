import { TABLE_ORDER } from '@/types/progress'

/** 3 ay × 4 hafta iskeleti — içerik genişletmeye açık. */
export const THREE_MONTH_PLAN = {
  months: [
    {
      monthIndex: 1,
      focus: '1,2,5,10',
      weeks: [
        { week: 1, tables: [1], review: [] as number[] },
        { week: 2, tables: [2], review: [1] },
        { week: 3, tables: [5], review: [1, 2] },
        { week: 4, tables: [10], review: [2, 5] },
      ],
    },
    {
      monthIndex: 2,
      focus: '3,4,6',
      weeks: [
        { week: 5, tables: [3], review: [2, 5, 10] },
        { week: 6, tables: [4], review: [3] },
        { week: 7, tables: [6], review: [3, 4] },
        { week: 8, tables: [3, 4, 6], review: [5, 10] },
      ],
    },
    {
      monthIndex: 3,
      focus: '7,8,9 + karışık',
      weeks: [
        { week: 9, tables: [7], review: [6] },
        { week: 10, tables: [8], review: [7] },
        { week: 11, tables: [9], review: [8] },
        { week: 12, tables: TABLE_ORDER.slice(), review: [] },
      ],
    },
  ],
} as const
