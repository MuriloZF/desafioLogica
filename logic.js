function getInput(){
	const textArea = document.querySelector("textarea");
	return textArea.value;
}

function clearFunction(){
	const fnc = document.getElementById("FNC");
	const fdc = document.getElementById("FDC");
	document.getElementById("form").reset();
	fnc.textContent = "";
	fdc.textContent = "";
}

function fncFunction(){
	const inputValue = getInput();
	const fnc = document.getElementById("FNC");
	fnc.textContent = inputValue;
	MathJax.typesetPromise([fnc]);
}

function fdcFunction(){
	const inputValue = getInput();
	const fdc = document.getElementById("FDC");
	fdc.textContent = inputValue;
	MathJax.typesetPromise([fdc]);
}


document.addEventListener("DOMContentLoaded", () => {
    const submit = document.querySelector("input[type='submit']");
    submit.addEventListener("click", (event) => {
        event.preventDefault();
        fncFunction();
	fdcFunction();
    });
    const clearButton = document.querySelector("button");
    clearButton.addEventListener("click", (event) => {
	   	event.preventDefault();
		clearFunction();
    });
});

