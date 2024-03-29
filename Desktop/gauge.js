/* global window, define, module */
(function(global, factory) {
    const Gauge = factory(global)
    if (typeof define === 'function' && define.amd) {
        // AMD support
        define(function() {
            return Gauge
        })
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS support
        module.exports = Gauge
    } else {
        // We are probably running in the browser
        global.Gauge = Gauge
    }
})(typeof window === 'undefined' ? this : window, function(global) {
    const document = global.document
    const requestAnimationFrame = (global.requestAnimationFrame ||
        global.mozRequestAnimationFrame ||
        global.webkitRequestAnimationFrame ||
        global.msRequestAnimationFrame ||
        function(cb) {
            return setTimeout(cb, 1000 / 60)
        })

    // EXPERIMENTAL!!
    /**
     * Simplistic animation function for animating the gauge. That's all!
     * Options are:
     * {
     *  duration: 1,    // In seconds
     *  start: 0,       // The start value
     *  end: 100,       // The end value
     *  step: function, // REQUIRED! The step function that will be passed the value and does something
     *  easing: function // The easing function. Default is easeInOutCubic
     * }
     */
    function Animation(options) {
        const duration = options.duration
        let currentIteration = 1
        const iterations = 60 * duration
        const start = options.start || 0
        const end = options.end
        const change = end - start
        const step = options.step
        const easing = options.easing || function easeInOutCubic(pos) {
            // https://github.com/danro/easing-js/blob/master/easing.js
            if ((pos /= 0.5) < 1) return 0.5 * Math.pow(pos, 3)
            return 0.5 * (Math.pow((pos - 2), 3) + 2)
        }

        function animate() {
            const progress = (currentIteration++) / iterations
            const value = change * easing(progress) + start
            // console.log(progress + ", " + value);
            step(value)
            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }
        // start!
        requestAnimationFrame(animate)
    }

    const Gauge = (function() {
        const SVG_NS = 'http://www.w3.org/2000/svg'

        const GaugeDefaults = {
            dialStartAngle: 135,
            dialEndAngle: 45,
            centerX: 500,
            centerY: 500,
            radius: 400
        }

        /**
         * A utility function to create SVG dom tree
         * @param {String} name The SVG element name
         * @param {Object} attrs The attributes as they appear in DOM e.g. stroke-width and not strokeWidth
         * @param {Array} children An array of children (can be created by this same function)
         * @return The SVG element
         */
        function svg(name, attrs, children) {
            const elem = document.createElementNS(SVG_NS, name)
            for (const attrName in attrs) {
                elem.setAttribute(attrName, attrs[attrName])
            }

            if (children) {
                children.forEach(function(c) {
                    elem.appendChild(c)
                })
            }
            return elem
        }

        /**
         * Translates percentage value to angle. e.g. If gauge span angle is 180deg, then 50%
         * will be 90deg
         */
        function getAngle(percentage, gaugeSpanAngle) {
            return percentage * gaugeSpanAngle / 100
        }

        function normalize(value, limit) {
            const val = Number(value)
            if (val > limit) return limit
            if (val < 0) return 0
            return val
        }

        function getValueInPercentage(value, limit) {
            return 100 * value / limit
        }

        /**
         * Gets cartesian co-ordinates for a specified radius and angle (in degrees)
         * @param cx {Number} The center x co-oriinate
         * @param cy {Number} The center y co-ordinate
         * @param radius {Number} The radius of the circle
         * @param angle {Number} The angle in degrees
         * @return An object with x,y co-ordinates
         */
        function getCartesian(cx, cy, radius, angle) {
            const rad = angle * Math.PI / 180
            return {
                x: Math.round((cx + radius * Math.cos(rad)) * 1000) / 1000,
                y: Math.round((cy + radius * Math.sin(rad)) * 1000) / 1000
            }
        }

        // Returns start and end points for dial
        // i.e. starts at 135deg ends at 45deg with large arc flag
        // REMEMBER!! angle=0 starts on X axis and then increases clockwise
        function getDialCoords(radius, startAngle, endAngle) {
            const cx = GaugeDefaults.centerX
            const cy = GaugeDefaults.centerY
            return {
                end: getCartesian(cx, cy, radius, endAngle),
                start: getCartesian(cx, cy, radius, startAngle)
            }
        }

        function defaultLabelRenderer(theValue) {
            return Math.round(theValue)
        }

        /**
         * Creates a Gauge object. This should be called without the 'new' operator. Various options
         * can be passed for the gauge:
         * {
         *    dialStartAngle: The angle to start the dial. MUST be greater than dialEndAngle. Default 135deg
         *    dialEndAngle: The angle to end the dial. Default 45deg
         *    radius: The gauge's radius. Default 400
         *    max: The maximum value of the gauge. Default 100
         *    value: The starting value of the gauge. Default 0
         *    label: The function on how to render the center label (Should return a value)
         * }
         * @param {Element} elem The DOM into which to render the gauge
         * @param {Object} opts The gauge options
         * @return a Gauge object
         */
        return function Gauge(elem, opts) {
            opts = opts || {}
            const gaugeContainer = elem
            let limit = opts.max || 100
            let value = normalize(opts.value || 0, limit)
            const radius = opts.radius || 400
            const displayValue = opts.showValue !== false
            const valueLabelRender = typeof(opts.label) === 'function' ? opts.label : defaultLabelRenderer
            let startAngle = typeof(opts.dialStartAngle) === 'undefined' ? 135 : opts.dialStartAngle
            let endAngle = typeof(opts.dialEndAngle) === 'undefined' ? 45 : opts.dialEndAngle
            const valueDialClass = typeof(opts.valueDialClass) === 'undefined' ? 'value' : opts.valueDialClass
            const valueTextClass = typeof(opts.valueTextClass) === 'undefined' ? 'value-text' : opts.valueTextClass
            const dialClass = typeof(opts.dialClass) === 'undefined' ? 'dial' : opts.dialClass
            const gaugeClass = typeof(opts.gaugeClass) === 'undefined' ? 'gauge' : opts.gaugeClass
            let gaugeTextElem
            let gaugeValuePath

            if (startAngle < endAngle) {
                console.log('WARNING! Start angle should be greater than end angle. Swapping')
                const tmp = startAngle
                startAngle = endAngle
                endAngle = tmp
            }

            function pathString(radius, startAngle, endAngle, largeArc) {
                const coords = getDialCoords(radius, startAngle, endAngle)
                const start = coords.start
                const end = coords.end
                const largeArcFlag = typeof(largeArc) === 'undefined' ? 1 : largeArc

                return ['M', start.x, start.y, 'A', radius, radius, '0', largeArcFlag, '1', end.x, end.y].join(' ')
            }

            function initializeGauge(elem) {
                gaugeTextElem = svg('text', {
                    class: valueTextClass,
                    x: 500,
                    y: 550,
                    'font-size': '400%',
                    'font-family': 'sans-serif',
                    'font-weight': 'bold',
                    'text-anchor': 'middle'
                })
                gaugeValuePath = svg('path', {
                    class: valueDialClass,
                    fill: 'transparent',
                    stroke: '#666',
                    'stroke-width': 25,
                    d: pathString(radius, startAngle, startAngle) // value of 0
                })

                const angle = getAngle(100, 360 - Math.abs(startAngle - endAngle))
                const flag = angle <= 180 ? 0 : 1
                const gaugeElement = svg('svg', {
                    viewBox: '0 0 1000 1000',
                    class: gaugeClass
                }, [
                    svg('path', {
                        class: dialClass,
                        fill: 'transparent',
                        stroke: '#eee',
                        'stroke-width': 20,
                        d: pathString(radius, startAngle, endAngle, flag)
                    }),
                    gaugeTextElem,
                    gaugeValuePath
                ])
                elem.appendChild(gaugeElement)
            }

            function updateGauge(theValue) {
                const val = getValueInPercentage(theValue, limit)
                // angle = getAngle(val, 360 - Math.abs(endAngle - startAngle)),
                const angle = getAngle(val, 360 - Math.abs(startAngle - endAngle))
                // this is because we are using arc greater than 180deg
                const flag = angle <= 180 ? 0 : 1;
                (displayValue && (gaugeTextElem.textContent = valueLabelRender.call(opts, theValue)))
                gaugeValuePath.setAttribute('d', pathString(radius, startAngle, angle + startAngle, flag))
            }

            const instance = {
                setMaxValue: function(max) {
                    limit = max
                },
                setValue: function(val) {
                    value = normalize(val, limit)
                    updateGauge(value)
                },
                setValueAnimated: function(val, duration) {
                    const oldVal = value
                    value = normalize(val, limit)
                    if (oldVal === value) {
                        return
                    }
                    Animation({
                        start: oldVal || 0,
                        end: value,
                        duration: duration || 1,
                        step: function(val) {
                            updateGauge(Math.round(val * 100) / 100)
                        }
                    })
                },
                getValue: function() {
                    return value
                }
            }

            initializeGauge(gaugeContainer)
            updateGauge(value)
            return instance
        }
    })()

    return Gauge
})