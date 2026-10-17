'use client'

import dynamic from 'next/dynamic'

/**
 * The form island, downloaded only by a page that renders a form. Forms and the newsletter signup
 * sit in a route every page shares, so a static import there puts the form's code in every page's
 * scripts (the home page's JavaScript budget). Still rendered on the server, so a form works
 * before, and without, JavaScript.
 */
export const ContactForm = dynamic(() => import('./contact-form').then((mod) => mod.ContactForm))
