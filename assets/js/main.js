var leftTab, rightTab

$(document).ready(function () {

    leftTab = document.getElementById('left-tab')
    rightTab = document.getElementById('right-tab')
  }
)

function showLeft () {
  if (leftTab) {
    leftTab.style.display = 'block'
    leftTab.setAttribute('class', 'rotateInUpLeft self-animated')
  }
}

function goneLeft () {
  if (leftTab) {
    leftTab.setAttribute('class', 'rotateOutDownLeft self-animated')
  }
}

function showRight () {
  if (rightTab) {
    rightTab.style.display = 'block'
    rightTab.setAttribute('class', 'rotateInUpRight self-animated')
  }
}

function goneRight () {
  if (rightTab) {
    rightTab.setAttribute('class', 'rotateOutDownRight self-animated')
  }
}

var os = function () {
  var ua = navigator.userAgent,
    isWindowsPhone = /(?:Windows Phone)/.test(ua),
    isSymbian = /(?:SymbianOS)/.test(ua) || isWindowsPhone,
    isAndroid = /(?:Android)/.test(ua),
    isFireFox = /(?:Firefox)/.test(ua),
    isChrome = /(?:Chrome|CriOS)/.test(ua),
    isTablet = /(?:iPad|PlayBook)/.test(ua) || (isAndroid && !/(?:Mobile)/.test(ua)) || (isFireFox && /(?:Tablet)/.test(ua)),
    isPhone = /(?:iPhone)/.test(ua) && !isTablet,
    isPc = !isPhone && !isAndroid && !isSymbian
  return {
    isTablet: isTablet,
    isPhone: isPhone,
    isAndroid: isAndroid,
    isPc: isPc
  }
}()

