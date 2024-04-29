'use client'
import { useState } from 'react';

const PhoneInputQi = ({ className }) => {
  const code = '+7 '
  const [value, setValue] = useState('');

  const handleFocus = () => {
    if (value === '') {
      setValue(code);
    }
  };

  const handleChange = (e) => {
    let inputValue = e.target.value;
    const onlyNumbers = inputValue.slice(3, 16).replace(/[^\d]/g, '');

    let formattedValue = '';
    for (let i = 0; i < onlyNumbers.length; i++) {
      if (i === 3 || i === 6 || i === 8 || i === 10) {
        formattedValue += ' ';
      }
      formattedValue += onlyNumbers[i];
    }

    const result = code + formattedValue

    setValue(result);

  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      maxLength={16}
      className={className}
      placeholder=" "
    />
  );
};

export default PhoneInputQi;