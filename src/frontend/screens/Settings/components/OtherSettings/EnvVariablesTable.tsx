import React from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox } from 'frontend/components/UI'
import {
  ColumnProps,
  TableInput
} from 'frontend/components/UI/TwoColTableInput'
import { EnviromentVariable } from 'common/types'

interface Props {
  environmentVariables: EnviromentVariable[]
  handleEnviromentVariables: (variables: EnviromentVariable[]) => void
}

const EnvVariablesTable = ({
  environmentVariables,
  handleEnviromentVariables
}: Props) => {
  const { t } = useTranslation()

  const getEnvironmentVariables = () => {
    const columns: ColumnProps[] = []
    environmentVariables.forEach((env) =>
      columns.push({ key: env.key, value: env.value })
    )
    return columns
  }

  const onEnvVariablesChange = (cols: ColumnProps[]) => {
    const envs: EnviromentVariable[] = []
    cols.forEach((col) =>
      envs.push({ key: col.key.trim(), value: col.value.trim() })
    )
    handleEnviromentVariables(envs)
  }

  const envVariablesInfo = (
    <InfoBox text="infobox.help">
      {t(
        'options.env_variables.info',
        'Set environment variables to append to the command.'
      )}
      <br />
      {t(
        'options.env_variables.example',
        'Do NOT include the "=" sign, e.g: for a setting like "MY_FLAG=123", set MY_FLAG in NAME and 123 in VALUE.'
      )}
    </InfoBox>
  )

  return (
    <TableInput
      label={t('options.advanced.title', 'Environment Variables')}
      htmlId={'enviromentOptions'}
      header={{
        key: t('options.advanced.key', 'Variable Name'),
        value: t('options.advanced.value', 'Value')
      }}
      rows={getEnvironmentVariables()}
      onChange={onEnvVariablesChange}
      connector="="
      validation={(key: string, value: string) => {
        let keyError = ''
        const valueError = ''

        if (key.match(/=/)) {
          keyError = t(
            'options.env_variables.error.equal_sign_in_key',
            `Variable names can't contain the "=" sign`
          )
        } else if (key.match(/ /)) {
          keyError = t(
            'options.env_variables.error.space_in_key',
            `Variable names can't contain spaces`
          )
        }

        if (value && !key) {
          keyError = t(
            'options.env_variables.error.empty_key',
            `Variable names can't be empty`
          )
        }

        return [keyError, valueError]
      }}
      inputPlaceHolder={{
        key: t('options.advanced.placeHolderKey', 'NAME'),
        value: t(
          'options.advanced.placeHolderValue',
          'E.g.: Path/To/ExtraFiles'
        )
      }}
      afterInput={envVariablesInfo}
    />
  )
}

export default EnvVariablesTable
