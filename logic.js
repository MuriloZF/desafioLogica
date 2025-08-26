function input(){
	const textarea = document.querySelector("textarea");
	const input = textarea.value;
	const fnc = document.getElementById("FNC");
	fnc.textContent = input;
}

function fnc(){}

function fdc(){}


document.addEventListener("DOMContentLoaded", () => {
    const submit = document.querySelector("input[type='submit']");
    submit.addEventListener("click", (event) => {
        event.preventDefault();
        input();
    });
});

