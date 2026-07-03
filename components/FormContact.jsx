'use client'
import { useState } from "react";
import { FaPhone, FaCircleCheck } from "react-icons/fa6";
import { ImSpinner2 } from "react-icons/im";

export default function FormContact({ titleForForm }) {

    const code = '+7 ';
    const [spinner, setSpinner] = useState(false);
    const [success, setSuccess] = useState(false)
    const [submitError, setSubmitError] = useState('');
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
        setSubmitError('');

        try {
            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: formData.NAME,
                    lastName: formData.LAST_NAME,
                    email: formData.EMAIL,
                    phone: formData.PHONE,
                    company: formData.COMPANY_TITLE,
                    message: formData.TITLE,
                }),
            });
            if (response.ok) {
                setSuccess(true)
            } else {
                const data = await response.json().catch(() => ({}));
                setSubmitError(data.error || 'Не удалось отправить данные, попробуйте позже');
            }
        } catch (error) {
            setSubmitError('Не удалось отправить данные, проверьте соединение');
        } finally {
            setSpinner(false);
        }
    };


    return (
        success ?
            <div className="flex min-h-60 w-full flex-col items-center justify-center space-y-3 py-8 text-center animate-apparition">
                <FaCircleCheck className="h-12 w-12 text-primary_green" />
                <h2 className="text-xl font-semibold text-night_green">Заявка отправлена!</h2>
                <p className="max-w-72 text-sm text-gray-500">
                    Спасибо за обращение — наш специалист свяжется с вами в ближайшее время.
                </p>
            </div>
            :
            <section>

                <h1 className="mb-5 text-center text-2xl font-semibold text-night_green">{titleForForm}</h1>
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


                    <button
                        type="submit"
                        disabled={spinner}
                        className="w-full cursor-pointer rounded-full bg-primary_green py-3 text-lg font-semibold text-white shadow-md transition duration-300 hover:bg-contrast_green active:scale-95 active:shadow-inner active:shadow-dark_green disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {spinner
                            ? (
                                <div className="flex justify-center items-center">
                                    <ImSpinner2 className="animate-spin h-6 w-6 mr-3" />
                                    <span>Отправляем...</span>
                                </div>) : (
                                <span>Отправить</span>
                            )}

                    </button>

                    {submitError && (
                        <p className="text-center text-sm text-red-500">{submitError}</p>
                    )}

                    <p className="text-center text-xs leading-snug text-gray-400">
                        Нажимая «Отправить», вы соглашаетесь на обработку персональных данных.
                    </p>
                </form>
            </section>
    )
}