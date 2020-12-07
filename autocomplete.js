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
	$('input[name*="login" i], input[id*="login" i], input[name*="user" i], input[id*="user" i], input[name*="email" i], input[id*="email" i], input[type="email" i]').val(value);
}

function fillPassword (value) {
	$('input[name*="pwd" i], input[id*="pwd" i], input[name*="password" i], input[id*="password" i], input[type="password" i]').val(value);
}

function fillPasswordClue (value) {
	$('input[name*="pwd" i], input[id*="pwd" i], input[name*="password" i], input[id*="password" i], input[type="password" i]').attr('placeholder', value);
}

function submitForm () {
	$('[type="submit" i]').click();
}