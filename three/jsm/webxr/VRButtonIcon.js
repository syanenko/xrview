class VRButtonIcon {
	static createButton( renderer ) {
		const button = document.createElement( 'button' );

		function showEnterVR( /*device*/ ) {
			let currentSession = null;
			async function onSessionStarted( session ) {
				session.addEventListener( 'end', onSessionEnded );
				await renderer.xr.setSession( session );
				// button.textContent = 'EXIT VR';
				currentSession = session;
			}

			function onSessionEnded( /*event*/ ) {
				currentSession.removeEventListener( 'end', onSessionEnded );
				// button.textContent = 'ENTER VR';
				currentSession = null;
			}

			// Style
			button.style.display = '';
			button.style.cursor = 'pointer';
      button.style.opacity = '0.5';
			// WebXR's requestReferenceSpace only works if the corresponding feature
			// was requested at session creation time. For simplicity, just ask for
			// the interesting ones as optional features, but be aware that the
			// requestReferenceSpace call will fail if it turns out to be unavailable.
			// ('local' is always available for immersive sessions and doesn't need to
			// be requested separately.)

			const sessionInit = { optionalFeatures: [ 'local-floor', 'bounded-floor', 'hand-tracking', 'layers' ] };
			button.onmouseenter = function () {
				button.style.opacity = '1.0';
			};

			button.onmouseleave = function () {
				button.style.opacity = '0.5';
			};

			button.onclick = function () {
				if ( currentSession === null ) {
					navigator.xr.requestSession( 'immersive-vr', sessionInit ).then( onSessionStarted );
				} else {
					currentSession.end();
					if ( navigator.xr.offerSession !== undefined ) {
						navigator.xr.offerSession( 'immersive-vr', sessionInit )
							.then( onSessionStarted )
							.catch( ( err ) => {
								console.warn( err );
							} );
					}
				}
			};

			if ( navigator.xr.offerSession !== undefined ) {
				navigator.xr.offerSession( 'immersive-vr', sessionInit )
					.then( onSessionStarted )
					.catch( ( err ) => {
						console.warn( err );
					} );
			}
		}

		function disableButton() {
			button.style.display = '';
			button.style.cursor = 'auto';
			button.onmouseenter = null;
			button.onmouseleave = null;
			button.onclick = null;
		}

		function showWebXRNotFound() {
			disableButton();
			button.textContent = 'VR NOT SUPPORTED';
		}

		function showVRNotAllowed( exception ) {
			disableButton();
			console.warn( 'Exception when trying to call xr.isSessionSupported', exception );
			button.textContent = 'VR NOT ALLOWED';
		}

		function stylizeElement( element ) {
      element.style.background = 'none';
      element.style.border = 'none';
      element.innerHTML = "<img src='three/jsm/webxr/assets/icons/outline_view_in_ar_white_24dp.png'/>";
			element.style.zIndex = '999';
		}

		if ( 'xr' in navigator ) {
			button.id = 'VRButtonIcon';
			button.style.display = 'none';
			stylizeElement( button );

			navigator.xr.isSessionSupported( 'immersive-vr' ).then( function ( supported ) {
				supported ? showEnterVR() : showWebXRNotFound();
				if ( supported && VRButtonIcon.xrSessionIsGranted ) {
					button.click();
				}

			} ).catch( showVRNotAllowed );
			return button;
		} else {

			const message = document.createElement( 'a' );

			if ( window.isSecureContext === false ) {

				message.href = document.location.href.replace( /^http:/, 'https:' );
				message.innerHTML = 'WEBXR NEEDS HTTPS'; // TODO Improve message
			} else {
				message.href = 'https://immersiveweb.dev/';
				message.innerHTML = 'WEBXR NOT AVAILABLE';
			}

			message.style.left = 'calc(50% - 90px)';
			message.style.width = '180px';
			message.style.textDecoration = 'none';

			stylizeElement( message );
			return message;
		}
	}

	static registerSessionGrantedListener() {

		if ( typeof navigator !== 'undefined' && 'xr' in navigator ) {
			// WebXRViewer (based on Firefox) has a bug where addEventListener
			// throws a silent exception and aborts execution entirely.
			if ( /WebXRViewer\//i.test( navigator.userAgent ) ) return;
			navigator.xr.addEventListener( 'sessiongranted', () => {
				VRButtonIcon.xrSessionIsGranted = true;
			} );
		}
	}
}

VRButtonIcon.xrSessionIsGranted = false;
VRButtonIcon.registerSessionGrantedListener();

export { VRButtonIcon };
