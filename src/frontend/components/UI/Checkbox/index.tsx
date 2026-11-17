import { Checkbox as MuiCheckbox, CheckboxProps } from '@mui/material'
import classNames from 'classnames'
import { Check } from 'lucide-react'
import Icon from '../Icon'
import './index.css'

type Props = CheckboxProps

/**
 * App checkbox: a desktop-sized, lightly rounded box that fills with the theme
 * accent when checked. Uses custom icons so the corner radius and size stay
 * under our control (MUI's default SVG can't be rounded), and the check mark
 * comes from the shared Icon atom.
 */
export default function Checkbox({ className, ...rest }: Props) {
  return (
    <MuiCheckbox
      disableRipple
      className={classNames('Checkbox', className)}
      icon={<span className="Checkbox__box" />}
      checkedIcon={
        <span className="Checkbox__box Checkbox__box--checked">
          <Icon glyph={Check} />
        </span>
      }
      {...rest}
    />
  )
}
