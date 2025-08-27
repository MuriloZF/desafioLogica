function inputFunction(){
	const textarea = document.querySelector("textarea");
	const inputValue = textarea.value;
	const fnc = document.getElementById("FNC");
	const fdc = document.getElementById("FDC");
	fnc.textContent = inputValue;
	MathJax.typesetPromise([fnc]);
	fdc.textContent = inputValue;
	fdc.textContent = inputValue;
	MathJax.typesetPromise([fdc]);
}

function clearFunction(){
	const fnc = document.getElementById("FNC");
	const fdc = document.getElementById("FDC");
	document.getElementById("form").reset();
	fnc.textContent = "";
	fdc.textContent = "";
}

function fnc(){}

function fdc(){}


document.addEventListener("DOMContentLoaded", () => {
    const submit = document.querySelector("input[type='submit']");
    submit.addEventListener("click", (event) => {
        event.preventDefault();
        inputFunction();
    });
    const clearButton = document.querySelector("button");
    clearButton.addEventListener("click", (event) => {
	   	event.preventDefault();
		clearFunction();
    });
});

