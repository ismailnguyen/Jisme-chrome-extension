chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if(request.type === 'credentials') {
			fillUsername(request.login);
			
			if (request.password) {
				fillPassword(request.password);
				submitForm();
			}
			
			if (request.password_clue) {
				fillPasswordClue(request.password_clue);
			}
			
			// Todo:
			// Auto click social login buttons if password is social login
		}
	}
);

function fillUsername (value) {
	$('input[name*="login"], input[id*="login"], input[name*="user"], input[id*="user"], input[name*="email"], input[id*="email"], input[type="email"]').val(value);
}

function fillPassword (value) {
	$('input[name*="pwd"], input[id*="pwd"], input[name*="password"], input[id*="password"], input[type="password"]').val(value);
}

function fillPasswordClue (value) {
	$('input[name*="pwd"], input[id*="pwd"], input[name*="password"], input[id*="password"], input[type="password"]').attr('placeholder', value);
}

function submitForm () {
	$('[type="submit"]').click();
}