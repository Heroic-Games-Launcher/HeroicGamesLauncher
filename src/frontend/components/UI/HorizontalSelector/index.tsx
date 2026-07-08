import React, { ReactNode } from 'react'
import { Button, Divider, Stack, Typography } from '@mui/material'

interface SelectorOption {
  icon: ReactNode
  title: string
  subtitle: string
  onClick: () => void
}

interface Props {
  options: SelectorOption[]
}

function HorizontalSelector({ options }: Props) {
  return (
    <Stack
      direction={'row'}
      divider={
        <Divider
          sx={{
            backgroundColor: 'var(--text-default)',
            marginTop: 2,
            marginBottom: 2
          }}
          orientation={'vertical'}
          flexItem
        />
      }
      alignItems={'stretch'}
    >
      {options.map(({ icon, title, subtitle, onClick }, i) => (
        <Button
          key={i}
          sx={{
            color: 'var(--text-default)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'start',
            width: `${100 / options.length}%`,
            padding: 3
          }}
          onClick={onClick}
        >
          {icon}
          <Typography variant={'h5'}>{title}</Typography>
          <Typography
            variant={'subtitle2'}
            color={'var(--text-secondary)'}
            textAlign={'center'}
          >
            {subtitle}
          </Typography>
        </Button>
      ))}
    </Stack>
  )
}

export default React.memo(HorizontalSelector)
