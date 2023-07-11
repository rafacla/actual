import React from 'react';

import { colors, styles } from '../../style';
import { View, Select, Text, Modal } from '../common';

function SelectField({ width, style, options, value, onChange }) {
  return (
    <Select
      value={value}
      style={style}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">Choose field...</option>
      {options.map(x => (
        <option key={x} value={x}>
          {x}
        </option>
      ))}
    </Select>
  );
}

function SubLabel({ title }) {
  return (
    <Text style={{ fontSize: 13, marginBottom: 3, color: colors.n3 }}>
      {title}
    </Text>
  );
}

function onChange(date, name) {}

export default function EditCreditCard({ modalProps }) {
  let options = ['oi', 'oi2'];

  return (
    <Modal title="Create New Credit Card" {...modalProps}>
      {() => (
        <View style={{ maxWidth: 500, gap: 30 }}>
          <View style={{ gap: 10 }}>
            <View style={{ lineHeight: '1.4em', fontSize: 15 }}>
              <Text>
                <strong>Select an account</strong> to attach this new credit
                card. This account will work normally as you are used, but it
                will have extra futures to help you control your statements.
              </Text>
            </View>
            <View style={{ width: 200 }}>
              <SubLabel title="Date" />
              <SelectField
                width={200}
                options={options}
                value={''}
                style={{ marginRight: 5 }}
                onChange={name => onChange('date', name)}
              />
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}
