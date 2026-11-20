import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom에 <dialog>.showModal()/close()가 없으면 최소 동작만 채운다.
if (typeof HTMLDialogElement !== 'undefined') {
  const proto = HTMLDialogElement.prototype
  if (typeof proto.showModal !== 'function') {
    proto.showModal = function showModal() {
      this.setAttribute('open', '')
    }
  }
  if (typeof proto.close !== 'function') {
    proto.close = function close() {
      if (this.hasAttribute('open')) {
        this.removeAttribute('open')
        this.dispatchEvent(new Event('close'))
      }
    }
  }
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  document.cookie.split(';').forEach((part) => {
    const name = part.split('=')[0].trim()
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    }
  })
})
