'use client'
import { useState } from "react";
import { FaPhone } from "react-icons/fa6";
import { ImSpinner2 } from "react-icons/im";

export default function FormContact({ titleForForm }) {

    const api = process.env.API_KEY_BITRIX
    const code = '+7 ';
    const [spinner, setSpinner] = useState(false);
    const [success, setSuccess] = useState(false)
    const [hasErrorEmail, sethasErrorEmail] = useState(true);
    const [hasErrorName, setHasErrorName] = useState(true);
    const [hasErrorTel, setHasErrorTel] = useState(true);
    const [formData, setFormData] = useState({
        TITLE: '',
        NAME: '',
        LAST_NAME: '',
        EMAIL: '',
        PHONE: '+7 ',
        COMPANY_TITLE: '',
        MESSAGE: '',
        SOURCE_ID: 'Веб-сайт(форма на сайте)'
    });

    function handleCheckInput(e) {
        const { name, value } = e.target;
        let regex, hasError;
        switch (name) {
            case 'NAME':
                regex = /^[A-Za-zА-Яа-яЁё]{2,}$/;
                hasError = regex.test(value);
                setHasErrorName(hasError);
                setFormData(prevFormData => ({ ...prevFormData, [name]: value }));
                break;
            case 'LAST_NAME':
                regex = /^[A-Za-zА-Яа-яЁё]{2,}$/;
                hasError = regex.test(value);
                setHasErrorName(hasError);
                setFormData(prevFormData => ({ ...prevFormData, [name]: value }));
                break;
            case 'EMAIL':
                regex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
                hasError = regex.test(value);
                sethasErrorEmail(hasError);
                setFormData(prevFormData => ({ ...prevFormData, [name]: value }));
                break;
            case 'PHONE':
                let inputValue = value;
                const onlyNumbers = inputValue.slice(3, 16).replace(/[^\d]/g, '');

                let formattedValue = '';
                for (let i = 0; i < onlyNumbers.length; i++) {
                    if (i === 3 || i === 6 || i === 8 || i === 10) {
                        formattedValue += ' ';
                    }
                    formattedValue += onlyNumbers[i];
                }
                const result = code + formattedValue
                regex = /^.{7,}$/
                hasError = regex.test(result);
                setHasErrorTel(hasError);
                setFormData(prevFormData => ({ ...prevFormData, [name]: result }));
                break;
            default:
                setFormData(prevFormData => ({ ...prevFormData, [name]: value }));
                break;
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSpinner(true)

        // const query = new URLSearchParams(formData).toString();
        let query = '';
        for (const key in formData) {
            if (formData.hasOwnProperty(key)) {

                const formattedStr = key !== 'TITLE' && key !== 'SOURCE_ID' ? formData[key].replace(/[\s!#$%^&*()\-]/g, '') : formData[key];

                query += key === 'PHONE' || key === 'EMAIL'
                    ? `FIELDS[${key}][0][VALUE]=${formattedStr}&`
                    : `FIELDS[${key}]=${formattedStr}&`;

            }
        }
        query = query.slice(0, -1);
        console.log(query)

        const url = `https://neoset.bitrix24.ru/rest/1/${api}/crm.lead.add.json?${query}`;
        try {
            const response = await fetch(url, {
                method: 'GET'
            });
            if (response.ok) {
                console.log('Данные успешно отправлены');
                setSuccess(true)
            } else {
                console.error('Ошибка при отправке данных');
                // Действия в случае неудачной отправки
            }
        } catch (error) {
            console.error('Ошибка при отправке данных:', error);
            // Обработка ошибок
        } finally {
            setSpinner(false); // Устанавливаем состояние загрузки в false после выполнения запроса
        }
    };


    return (
        success ?
            <div className="flex justify-center items-center h-500">
                <h2 className="text-xl text-primary_green">Данные успешно отправлены!</h2>
            </div>
            :
            <section>

                <h1 className="text-2xl mb-4 text-center">{titleForForm}</h1>
                <form onSubmit={handleSubmit} className=" space-y-4 max-w-96">

                    <div className="relative">
                        <input id="first_name" type="text" required className={hasErrorName ? "input border-gray-300  focus:border-primary_green peer " : "input border-red-500"} placeholder=" " name='NAME' onChange={handleCheckInput} />
                        <label htmlFor="first_name" className="label ">Ваше имя</label>
                    </div>

                    <div className="relative">
                        <input id="last_name" type="text" required className={hasErrorName ? "input border-gray-300  focus:border-primary_green peer " : "input border-red-500"} placeholder=" " name='LAST_NAME' onChange={handleCheckInput} />
                        <label htmlFor="last_name" className="label ">Ваша фамилия</label>
                    </div>

                    <div className="relative">
                        <input id="your_email" type="email" required className={hasErrorEmail ? "input border-gray-300  focus:border-primary_green peer" : "input border-red-500"} placeholder=" " name='EMAIL' onChange={handleCheckInput} />
                        <label htmlFor="your_email" className="label">Ваш e-mail</label>
                    </div>

                    <div className="relative">
                        <input maxLength={16} type="text" id="your_phone_number" className={hasErrorTel ? "pl-10 input border-gray-300  focus:border-primary_green peer" : "pl-10 input border-red-500 "} placeholder=" " name='PHONE' onChange={handleCheckInput} value={formData.PHONE} />
                        <div className="absolute inset-y-0 start-0 top-0 flex items-center ps-3.5 pointer-events-none peer-focus:translate-y-1.5 duration-300 transform translate-y-1.5 peer-placeholder-shown:translate-y-0">
                            <FaPhone />
                        </div>
                        <label htmlFor="your_phone_number" className="pl-8 label">Ваш телефон</label>
                    </div>

                    <div className="relative">
                        <input id="your_company" type="text" className="input border-gray-300  focus:border-primary_green peer" placeholder=" " name='COMPANY_TITLE' onChange={handleCheckInput} />
                        <label htmlFor="your_company" className="label">Название компании</label>
                    </div>

                    <div className="relative">
                        <textarea rows="4" cols="50" id="your_message" type="text" className="input border-gray-300  focus:border-primary_green peer " placeholder=" " name='TITLE' onChange={handleCheckInput} />
                        <label htmlFor="your_message" className="label">Ваше сообщение</label>
                    </div>


                    <button type="submit" className="py-4 bg-primary_green text-xl shadow-md text-white w-full rounded-full cursor-pointer transition duration-300 hover:bg-contrast_green active:shadow-inner active:shadow-dark_green active:scale-95">
                        {spinner
                            ? (
                                <div className="flex justify-center items-center">
                                    <ImSpinner2 className="animate-spin h-7 w-7 mr-3" />
                                    <span>Отправляем...</span>
                                </div>) : (
                                <span>Отправить</span>
                            )}

                    </button>
                </form>
            </section>
    )
}