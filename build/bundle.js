
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run$1(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run$1);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function self$1(fn) {
        return function (event) {
            // @ts-ignore
            if (event.target === this)
                fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run$1).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\core\Oops.svelte generated by Svelte v3.38.3 */

    const file$l = "src\\core\\Oops.svelte";

    function create_fragment$o(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Oops...";
    			add_location(p, file$l, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Oops", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Oops> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Oops extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Oops",
    			options,
    			id: create_fragment$o.name
    		});
    	}
    }

    /* src\core\Logger.svelte generated by Svelte v3.38.3 */

    const file$k = "src\\core\\Logger.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (25:0) {#each lines as line}
    function create_each_block$4(ctx) {
    	let p;
    	let t_value = /*line*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file$k, 25, 4, 600);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lines*/ 1 && t_value !== (t_value = /*line*/ ctx[1] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(25:0) {#each lines as line}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$n(ctx) {
    	let each_1_anchor;
    	let each_value = /*lines*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*lines*/ 1) {
    				each_value = /*lines*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$n.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    let _lines = [];

    let _refresh = () => {
    	
    };

    function log(level, msg, err) {
    	let line = `${level} ${msg}`;
    	if (err) line += ` (${err})`;
    	_lines.push(line);
    	_refresh();
    }

    function info(msg, err) {
    	log("I", msg, err === null || err === void 0 ? void 0 : err.message);
    }

    function error(msg, err) {
    	log("E", msg, err === null || err === void 0 ? void 0 : err.message);
    }

    function instance$n($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Logger", slots, []);
    	let lines = _lines;

    	_refresh = () => {
    		$$invalidate(0, lines = _lines);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Logger> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		_lines,
    		_refresh,
    		log,
    		info,
    		error,
    		lines
    	});

    	$$self.$inject_state = $$props => {
    		if ("lines" in $$props) $$invalidate(0, lines = $$props.lines);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [lines];
    }

    class Logger extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$n, create_fragment$n, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Logger",
    			options,
    			id: create_fragment$n.name
    		});
    	}
    }

    /* src\core\Grid.svelte generated by Svelte v3.38.3 */
    const file$j = "src\\core\\Grid.svelte";

    function create_fragment$m(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", div_class_value = "my-grid " + getBgColor(/*ga*/ ctx[1]) + " svelte-1hqqd40");
    			set_style(div, "grid-area", /*ga*/ ctx[1]);
    			set_style(div, "--areas", /*layout*/ ctx[0].areas);
    			set_style(div, "--cols", /*layout*/ ctx[0].cols);
    			set_style(div, "--rows", /*layout*/ ctx[0].rows);
    			add_location(div, file$j, 19, 0, 535);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div, "click", self$1(/*click_handler*/ ctx[4]), false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*ga*/ 2 && div_class_value !== (div_class_value = "my-grid " + getBgColor(/*ga*/ ctx[1]) + " svelte-1hqqd40")) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (!current || dirty & /*ga*/ 2) {
    				set_style(div, "grid-area", /*ga*/ ctx[1]);
    			}

    			if (!current || dirty & /*layout*/ 1) {
    				set_style(div, "--areas", /*layout*/ ctx[0].areas);
    			}

    			if (!current || dirty & /*layout*/ 1) {
    				set_style(div, "--cols", /*layout*/ ctx[0].cols);
    			}

    			if (!current || dirty & /*layout*/ 1) {
    				set_style(div, "--rows", /*layout*/ ctx[0].rows);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getBgColor(ga) {
    	let fn = getContext("get-bg-color");
    	if (!fn) return "bg-transparent";
    	return fn(ga);
    }

    function instance$m($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Grid", slots, ['default']);
    	let { layout } = $$props;
    	let { ga = "unset" } = $$props;

    	setContext("get-bg-color", function (ga) {
    		var _a;
    		if (!layout.bgColors) return "bg-transparent";

    		return (_a = layout.bgColors[ga]) !== null && _a !== void 0
    		? _a
    		: "bg-transparent";
    	});

    	const writable_props = ["layout", "ga"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Grid> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("layout" in $$props) $$invalidate(0, layout = $$props.layout);
    		if ("ga" in $$props) $$invalidate(1, ga = $$props.ga);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		setContext,
    		getBgColor,
    		layout,
    		ga
    	});

    	$$self.$inject_state = $$props => {
    		if ("layout" in $$props) $$invalidate(0, layout = $$props.layout);
    		if ("ga" in $$props) $$invalidate(1, ga = $$props.ga);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [layout, ga, $$scope, slots, click_handler];
    }

    class Grid extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, { layout: 0, ga: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Grid",
    			options,
    			id: create_fragment$m.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*layout*/ ctx[0] === undefined && !("layout" in props)) {
    			console.warn("<Grid> was created without expected prop 'layout'");
    		}
    	}

    	get layout() {
    		throw new Error("<Grid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set layout(value) {
    		throw new Error("<Grid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ga() {
    		throw new Error("<Grid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Grid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\core\Version.svelte generated by Svelte v3.38.3 */

    const file$i = "src\\core\\Version.svelte";

    function create_fragment$l(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*v*/ ctx[1]);
    			attr_dev(span, "class", "text-xs text-gray-300");
    			set_style(span, "grid-area", /*ga*/ ctx[0]);
    			add_location(span, file$i, 4, 0, 62);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*v*/ 2) set_data_dev(t, /*v*/ ctx[1]);

    			if (dirty & /*ga*/ 1) {
    				set_style(span, "grid-area", /*ga*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Version", slots, []);
    	let { ga } = $$props;
    	let { v } = $$props;
    	const writable_props = ["ga", "v"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Version> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("v" in $$props) $$invalidate(1, v = $$props.v);
    	};

    	$$self.$capture_state = () => ({ ga, v });

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("v" in $$props) $$invalidate(1, v = $$props.v);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, v];
    }

    class Version extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, { ga: 0, v: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Version",
    			options,
    			id: create_fragment$l.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Version> was created without expected prop 'ga'");
    		}

    		if (/*v*/ ctx[1] === undefined && !("v" in props)) {
    			console.warn("<Version> was created without expected prop 'v'");
    		}
    	}

    	get ga() {
    		throw new Error("<Version>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Version>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get v() {
    		throw new Error("<Version>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set v(value) {
    		throw new Error("<Version>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\core\Powered.svelte generated by Svelte v3.38.3 */

    const file$h = "src\\core\\Powered.svelte";

    function create_fragment$k(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*text*/ ctx[1]);
    			attr_dev(span, "class", "text-xs text-gray-400");
    			set_style(span, "grid-area", /*ga*/ ctx[0]);
    			add_location(span, file$h, 4, 0, 65);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 2) set_data_dev(t, /*text*/ ctx[1]);

    			if (dirty & /*ga*/ 1) {
    				set_style(span, "grid-area", /*ga*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Powered", slots, []);
    	let { ga } = $$props;
    	let { text } = $$props;
    	const writable_props = ["ga", "text"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Powered> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    	};

    	$$self.$capture_state = () => ({ ga, text });

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, text];
    }

    class Powered extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, { ga: 0, text: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Powered",
    			options,
    			id: create_fragment$k.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Powered> was created without expected prop 'ga'");
    		}

    		if (/*text*/ ctx[1] === undefined && !("text" in props)) {
    			console.warn("<Powered> was created without expected prop 'text'");
    		}
    	}

    	get ga() {
    		throw new Error("<Powered>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Powered>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get text() {
    		throw new Error("<Powered>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<Powered>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var dist = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
    	module.exports = factory() ;
    }(commonjsGlobal, (function () {
    	function createCommonjsModule(fn, module) {
    		return module = { exports: {} }, fn(module, module.exports), module.exports;
    	}

    	var _global = createCommonjsModule(function (module) {
    	// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
    	var global = module.exports = typeof window != 'undefined' && window.Math == Math
    	  ? window : typeof self != 'undefined' && self.Math == Math ? self
    	  // eslint-disable-next-line no-new-func
    	  : Function('return this')();
    	if (typeof __g == 'number') { __g = global; } // eslint-disable-line no-undef
    	});

    	var _core = createCommonjsModule(function (module) {
    	var core = module.exports = { version: '2.6.5' };
    	if (typeof __e == 'number') { __e = core; } // eslint-disable-line no-undef
    	});
    	_core.version;

    	var _isObject = function (it) {
    	  return typeof it === 'object' ? it !== null : typeof it === 'function';
    	};

    	var _anObject = function (it) {
    	  if (!_isObject(it)) { throw TypeError(it + ' is not an object!'); }
    	  return it;
    	};

    	var _fails = function (exec) {
    	  try {
    	    return !!exec();
    	  } catch (e) {
    	    return true;
    	  }
    	};

    	// Thank's IE8 for his funny defineProperty
    	var _descriptors = !_fails(function () {
    	  return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
    	});

    	var document = _global.document;
    	// typeof document.createElement is 'object' in old IE
    	var is = _isObject(document) && _isObject(document.createElement);
    	var _domCreate = function (it) {
    	  return is ? document.createElement(it) : {};
    	};

    	var _ie8DomDefine = !_descriptors && !_fails(function () {
    	  return Object.defineProperty(_domCreate('div'), 'a', { get: function () { return 7; } }).a != 7;
    	});

    	// 7.1.1 ToPrimitive(input [, PreferredType])

    	// instead of the ES6 spec version, we didn't implement @@toPrimitive case
    	// and the second argument - flag - preferred type is a string
    	var _toPrimitive = function (it, S) {
    	  if (!_isObject(it)) { return it; }
    	  var fn, val;
    	  if (S && typeof (fn = it.toString) == 'function' && !_isObject(val = fn.call(it))) { return val; }
    	  if (typeof (fn = it.valueOf) == 'function' && !_isObject(val = fn.call(it))) { return val; }
    	  if (!S && typeof (fn = it.toString) == 'function' && !_isObject(val = fn.call(it))) { return val; }
    	  throw TypeError("Can't convert object to primitive value");
    	};

    	var dP = Object.defineProperty;

    	var f = _descriptors ? Object.defineProperty : function defineProperty(O, P, Attributes) {
    	  _anObject(O);
    	  P = _toPrimitive(P, true);
    	  _anObject(Attributes);
    	  if (_ie8DomDefine) { try {
    	    return dP(O, P, Attributes);
    	  } catch (e) { /* empty */ } }
    	  if ('get' in Attributes || 'set' in Attributes) { throw TypeError('Accessors not supported!'); }
    	  if ('value' in Attributes) { O[P] = Attributes.value; }
    	  return O;
    	};

    	var _objectDp = {
    		f: f
    	};

    	var _propertyDesc = function (bitmap, value) {
    	  return {
    	    enumerable: !(bitmap & 1),
    	    configurable: !(bitmap & 2),
    	    writable: !(bitmap & 4),
    	    value: value
    	  };
    	};

    	var _hide = _descriptors ? function (object, key, value) {
    	  return _objectDp.f(object, key, _propertyDesc(1, value));
    	} : function (object, key, value) {
    	  object[key] = value;
    	  return object;
    	};

    	var hasOwnProperty = {}.hasOwnProperty;
    	var _has = function (it, key) {
    	  return hasOwnProperty.call(it, key);
    	};

    	var id = 0;
    	var px = Math.random();
    	var _uid = function (key) {
    	  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
    	};

    	var _shared = createCommonjsModule(function (module) {
    	var SHARED = '__core-js_shared__';
    	var store = _global[SHARED] || (_global[SHARED] = {});

    	(module.exports = function (key, value) {
    	  return store[key] || (store[key] = value !== undefined ? value : {});
    	})('versions', []).push({
    	  version: _core.version,
    	  mode: 'global',
    	  copyright: '© 2019 Denis Pushkarev (zloirock.ru)'
    	});
    	});

    	var _functionToString = _shared('native-function-to-string', Function.toString);

    	var _redefine = createCommonjsModule(function (module) {
    	var SRC = _uid('src');

    	var TO_STRING = 'toString';
    	var TPL = ('' + _functionToString).split(TO_STRING);

    	_core.inspectSource = function (it) {
    	  return _functionToString.call(it);
    	};

    	(module.exports = function (O, key, val, safe) {
    	  var isFunction = typeof val == 'function';
    	  if (isFunction) { _has(val, 'name') || _hide(val, 'name', key); }
    	  if (O[key] === val) { return; }
    	  if (isFunction) { _has(val, SRC) || _hide(val, SRC, O[key] ? '' + O[key] : TPL.join(String(key))); }
    	  if (O === _global) {
    	    O[key] = val;
    	  } else if (!safe) {
    	    delete O[key];
    	    _hide(O, key, val);
    	  } else if (O[key]) {
    	    O[key] = val;
    	  } else {
    	    _hide(O, key, val);
    	  }
    	// add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
    	})(Function.prototype, TO_STRING, function toString() {
    	  return typeof this == 'function' && this[SRC] || _functionToString.call(this);
    	});
    	});

    	var _aFunction = function (it) {
    	  if (typeof it != 'function') { throw TypeError(it + ' is not a function!'); }
    	  return it;
    	};

    	// optional / simple context binding

    	var _ctx = function (fn, that, length) {
    	  _aFunction(fn);
    	  if (that === undefined) { return fn; }
    	  switch (length) {
    	    case 1: return function (a) {
    	      return fn.call(that, a);
    	    };
    	    case 2: return function (a, b) {
    	      return fn.call(that, a, b);
    	    };
    	    case 3: return function (a, b, c) {
    	      return fn.call(that, a, b, c);
    	    };
    	  }
    	  return function (/* ...args */) {
    	    return fn.apply(that, arguments);
    	  };
    	};

    	var PROTOTYPE = 'prototype';

    	var $export = function (type, name, source) {
    	  var IS_FORCED = type & $export.F;
    	  var IS_GLOBAL = type & $export.G;
    	  var IS_STATIC = type & $export.S;
    	  var IS_PROTO = type & $export.P;
    	  var IS_BIND = type & $export.B;
    	  var target = IS_GLOBAL ? _global : IS_STATIC ? _global[name] || (_global[name] = {}) : (_global[name] || {})[PROTOTYPE];
    	  var exports = IS_GLOBAL ? _core : _core[name] || (_core[name] = {});
    	  var expProto = exports[PROTOTYPE] || (exports[PROTOTYPE] = {});
    	  var key, own, out, exp;
    	  if (IS_GLOBAL) { source = name; }
    	  for (key in source) {
    	    // contains in native
    	    own = !IS_FORCED && target && target[key] !== undefined;
    	    // export native or passed
    	    out = (own ? target : source)[key];
    	    // bind timers to global for call from export context
    	    exp = IS_BIND && own ? _ctx(out, _global) : IS_PROTO && typeof out == 'function' ? _ctx(Function.call, out) : out;
    	    // extend global
    	    if (target) { _redefine(target, key, out, type & $export.U); }
    	    // export
    	    if (exports[key] != out) { _hide(exports, key, exp); }
    	    if (IS_PROTO && expProto[key] != out) { expProto[key] = out; }
    	  }
    	};
    	_global.core = _core;
    	// type bitmap
    	$export.F = 1;   // forced
    	$export.G = 2;   // global
    	$export.S = 4;   // static
    	$export.P = 8;   // proto
    	$export.B = 16;  // bind
    	$export.W = 32;  // wrap
    	$export.U = 64;  // safe
    	$export.R = 128; // real proto method for `library`
    	var _export = $export;

    	// 7.1.4 ToInteger
    	var ceil = Math.ceil;
    	var floor = Math.floor;
    	var _toInteger = function (it) {
    	  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
    	};

    	// 7.2.1 RequireObjectCoercible(argument)
    	var _defined = function (it) {
    	  if (it == undefined) { throw TypeError("Can't call method on  " + it); }
    	  return it;
    	};

    	// true  -> String#at
    	// false -> String#codePointAt
    	var _stringAt = function (TO_STRING) {
    	  return function (that, pos) {
    	    var s = String(_defined(that));
    	    var i = _toInteger(pos);
    	    var l = s.length;
    	    var a, b;
    	    if (i < 0 || i >= l) { return TO_STRING ? '' : undefined; }
    	    a = s.charCodeAt(i);
    	    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
    	      ? TO_STRING ? s.charAt(i) : a
    	      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
    	  };
    	};

    	var $at = _stringAt(false);
    	_export(_export.P, 'String', {
    	  // 21.1.3.3 String.prototype.codePointAt(pos)
    	  codePointAt: function codePointAt(pos) {
    	    return $at(this, pos);
    	  }
    	});

    	_core.String.codePointAt;

    	var max = Math.max;
    	var min = Math.min;
    	var _toAbsoluteIndex = function (index, length) {
    	  index = _toInteger(index);
    	  return index < 0 ? max(index + length, 0) : min(index, length);
    	};

    	var fromCharCode = String.fromCharCode;
    	var $fromCodePoint = String.fromCodePoint;

    	// length should be 1, old FF problem
    	_export(_export.S + _export.F * (!!$fromCodePoint && $fromCodePoint.length != 1), 'String', {
    	  // 21.1.2.2 String.fromCodePoint(...codePoints)
    	  fromCodePoint: function fromCodePoint(x) {
    	    var arguments$1 = arguments;
    	 // eslint-disable-line no-unused-vars
    	    var res = [];
    	    var aLen = arguments.length;
    	    var i = 0;
    	    var code;
    	    while (aLen > i) {
    	      code = +arguments$1[i++];
    	      if (_toAbsoluteIndex(code, 0x10ffff) !== code) { throw RangeError(code + ' is not a valid code point'); }
    	      res.push(code < 0x10000
    	        ? fromCharCode(code)
    	        : fromCharCode(((code -= 0x10000) >> 10) + 0xd800, code % 0x400 + 0xdc00)
    	      );
    	    } return res.join('');
    	  }
    	});

    	_core.String.fromCodePoint;

    	// This is a generated file. Do not edit.
    	var Space_Separator = /[\u1680\u2000-\u200A\u202F\u205F\u3000]/;
    	var ID_Start = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE83\uDE86-\uDE89\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]/;
    	var ID_Continue = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u09FC\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF9\u1D00-\u1DF9\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDE00-\uDE3E\uDE47\uDE50-\uDE83\uDE86-\uDE99\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD47\uDD50-\uDD59]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4A\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/;

    	var unicode = {
    		Space_Separator: Space_Separator,
    		ID_Start: ID_Start,
    		ID_Continue: ID_Continue
    	};

    	var util = {
    	    isSpaceSeparator: function isSpaceSeparator (c) {
    	        return typeof c === 'string' && unicode.Space_Separator.test(c)
    	    },

    	    isIdStartChar: function isIdStartChar (c) {
    	        return typeof c === 'string' && (
    	            (c >= 'a' && c <= 'z') ||
    	        (c >= 'A' && c <= 'Z') ||
    	        (c === '$') || (c === '_') ||
    	        unicode.ID_Start.test(c)
    	        )
    	    },

    	    isIdContinueChar: function isIdContinueChar (c) {
    	        return typeof c === 'string' && (
    	            (c >= 'a' && c <= 'z') ||
    	        (c >= 'A' && c <= 'Z') ||
    	        (c >= '0' && c <= '9') ||
    	        (c === '$') || (c === '_') ||
    	        (c === '\u200C') || (c === '\u200D') ||
    	        unicode.ID_Continue.test(c)
    	        )
    	    },

    	    isDigit: function isDigit (c) {
    	        return typeof c === 'string' && /[0-9]/.test(c)
    	    },

    	    isHexDigit: function isHexDigit (c) {
    	        return typeof c === 'string' && /[0-9A-Fa-f]/.test(c)
    	    },
    	};

    	var source;
    	var parseState;
    	var stack;
    	var pos;
    	var line;
    	var column;
    	var token;
    	var key;
    	var root;

    	var parse = function parse (text, reviver) {
    	    source = String(text);
    	    parseState = 'start';
    	    stack = [];
    	    pos = 0;
    	    line = 1;
    	    column = 0;
    	    token = undefined;
    	    key = undefined;
    	    root = undefined;

    	    do {
    	        token = lex();

    	        // This code is unreachable.
    	        // if (!parseStates[parseState]) {
    	        //     throw invalidParseState()
    	        // }

    	        parseStates[parseState]();
    	    } while (token.type !== 'eof')

    	    if (typeof reviver === 'function') {
    	        return internalize({'': root}, '', reviver)
    	    }

    	    return root
    	};

    	function internalize (holder, name, reviver) {
    	    var value = holder[name];
    	    if (value != null && typeof value === 'object') {
    	        for (var key in value) {
    	            var replacement = internalize(value, key, reviver);
    	            if (replacement === undefined) {
    	                delete value[key];
    	            } else {
    	                value[key] = replacement;
    	            }
    	        }
    	    }

    	    return reviver.call(holder, name, value)
    	}

    	var lexState;
    	var buffer;
    	var doubleQuote;
    	var sign;
    	var c;

    	function lex () {
    	    lexState = 'default';
    	    buffer = '';
    	    doubleQuote = false;
    	    sign = 1;

    	    for (;;) {
    	        c = peek();

    	        // This code is unreachable.
    	        // if (!lexStates[lexState]) {
    	        //     throw invalidLexState(lexState)
    	        // }

    	        var token = lexStates[lexState]();
    	        if (token) {
    	            return token
    	        }
    	    }
    	}

    	function peek () {
    	    if (source[pos]) {
    	        return String.fromCodePoint(source.codePointAt(pos))
    	    }
    	}

    	function read () {
    	    var c = peek();

    	    if (c === '\n') {
    	        line++;
    	        column = 0;
    	    } else if (c) {
    	        column += c.length;
    	    } else {
    	        column++;
    	    }

    	    if (c) {
    	        pos += c.length;
    	    }

    	    return c
    	}

    	var lexStates = {
    	    default: function default$1 () {
    	        switch (c) {
    	        case '\t':
    	        case '\v':
    	        case '\f':
    	        case ' ':
    	        case '\u00A0':
    	        case '\uFEFF':
    	        case '\n':
    	        case '\r':
    	        case '\u2028':
    	        case '\u2029':
    	            read();
    	            return

    	        case '/':
    	            read();
    	            lexState = 'comment';
    	            return

    	        case undefined:
    	            read();
    	            return newToken('eof')
    	        }

    	        if (util.isSpaceSeparator(c)) {
    	            read();
    	            return
    	        }

    	        // This code is unreachable.
    	        // if (!lexStates[parseState]) {
    	        //     throw invalidLexState(parseState)
    	        // }

    	        return lexStates[parseState]()
    	    },

    	    comment: function comment () {
    	        switch (c) {
    	        case '*':
    	            read();
    	            lexState = 'multiLineComment';
    	            return

    	        case '/':
    	            read();
    	            lexState = 'singleLineComment';
    	            return
    	        }

    	        throw invalidChar(read())
    	    },

    	    multiLineComment: function multiLineComment () {
    	        switch (c) {
    	        case '*':
    	            read();
    	            lexState = 'multiLineCommentAsterisk';
    	            return

    	        case undefined:
    	            throw invalidChar(read())
    	        }

    	        read();
    	    },

    	    multiLineCommentAsterisk: function multiLineCommentAsterisk () {
    	        switch (c) {
    	        case '*':
    	            read();
    	            return

    	        case '/':
    	            read();
    	            lexState = 'default';
    	            return

    	        case undefined:
    	            throw invalidChar(read())
    	        }

    	        read();
    	        lexState = 'multiLineComment';
    	    },

    	    singleLineComment: function singleLineComment () {
    	        switch (c) {
    	        case '\n':
    	        case '\r':
    	        case '\u2028':
    	        case '\u2029':
    	            read();
    	            lexState = 'default';
    	            return

    	        case undefined:
    	            read();
    	            return newToken('eof')
    	        }

    	        read();
    	    },

    	    value: function value () {
    	        switch (c) {
    	        case '{':
    	        case '[':
    	            return newToken('punctuator', read())

    	        case 'n':
    	            read();
    	            literal('ull');
    	            return newToken('null', null)

    	        case 't':
    	            read();
    	            literal('rue');
    	            return newToken('boolean', true)

    	        case 'f':
    	            read();
    	            literal('alse');
    	            return newToken('boolean', false)

    	        case '-':
    	        case '+':
    	            if (read() === '-') {
    	                sign = -1;
    	            }

    	            lexState = 'sign';
    	            return

    	        case '.':
    	            buffer = read();
    	            lexState = 'decimalPointLeading';
    	            return

    	        case '0':
    	            buffer = read();
    	            lexState = 'zero';
    	            return

    	        case '1':
    	        case '2':
    	        case '3':
    	        case '4':
    	        case '5':
    	        case '6':
    	        case '7':
    	        case '8':
    	        case '9':
    	            buffer = read();
    	            lexState = 'decimalInteger';
    	            return

    	        case 'I':
    	            read();
    	            literal('nfinity');
    	            return newToken('numeric', Infinity)

    	        case 'N':
    	            read();
    	            literal('aN');
    	            return newToken('numeric', NaN)

    	        case '"':
    	        case "'":
    	            doubleQuote = (read() === '"');
    	            buffer = '';
    	            lexState = 'string';
    	            return
    	        }

    	        throw invalidChar(read())
    	    },

    	    identifierNameStartEscape: function identifierNameStartEscape () {
    	        if (c !== 'u') {
    	            throw invalidChar(read())
    	        }

    	        read();
    	        var u = unicodeEscape();
    	        switch (u) {
    	        case '$':
    	        case '_':
    	            break

    	        default:
    	            if (!util.isIdStartChar(u)) {
    	                throw invalidIdentifier()
    	            }

    	            break
    	        }

    	        buffer += u;
    	        lexState = 'identifierName';
    	    },

    	    identifierName: function identifierName () {
    	        switch (c) {
    	        case '$':
    	        case '_':
    	        case '\u200C':
    	        case '\u200D':
    	            buffer += read();
    	            return

    	        case '\\':
    	            read();
    	            lexState = 'identifierNameEscape';
    	            return
    	        }

    	        if (util.isIdContinueChar(c)) {
    	            buffer += read();
    	            return
    	        }

    	        return newToken('identifier', buffer)
    	    },

    	    identifierNameEscape: function identifierNameEscape () {
    	        if (c !== 'u') {
    	            throw invalidChar(read())
    	        }

    	        read();
    	        var u = unicodeEscape();
    	        switch (u) {
    	        case '$':
    	        case '_':
    	        case '\u200C':
    	        case '\u200D':
    	            break

    	        default:
    	            if (!util.isIdContinueChar(u)) {
    	                throw invalidIdentifier()
    	            }

    	            break
    	        }

    	        buffer += u;
    	        lexState = 'identifierName';
    	    },

    	    sign: function sign$1 () {
    	        switch (c) {
    	        case '.':
    	            buffer = read();
    	            lexState = 'decimalPointLeading';
    	            return

    	        case '0':
    	            buffer = read();
    	            lexState = 'zero';
    	            return

    	        case '1':
    	        case '2':
    	        case '3':
    	        case '4':
    	        case '5':
    	        case '6':
    	        case '7':
    	        case '8':
    	        case '9':
    	            buffer = read();
    	            lexState = 'decimalInteger';
    	            return

    	        case 'I':
    	            read();
    	            literal('nfinity');
    	            return newToken('numeric', sign * Infinity)

    	        case 'N':
    	            read();
    	            literal('aN');
    	            return newToken('numeric', NaN)
    	        }

    	        throw invalidChar(read())
    	    },

    	    zero: function zero () {
    	        switch (c) {
    	        case '.':
    	            buffer += read();
    	            lexState = 'decimalPoint';
    	            return

    	        case 'e':
    	        case 'E':
    	            buffer += read();
    	            lexState = 'decimalExponent';
    	            return

    	        case 'x':
    	        case 'X':
    	            buffer += read();
    	            lexState = 'hexadecimal';
    	            return
    	        }

    	        return newToken('numeric', sign * 0)
    	    },

    	    decimalInteger: function decimalInteger () {
    	        switch (c) {
    	        case '.':
    	            buffer += read();
    	            lexState = 'decimalPoint';
    	            return

    	        case 'e':
    	        case 'E':
    	            buffer += read();
    	            lexState = 'decimalExponent';
    	            return
    	        }

    	        if (util.isDigit(c)) {
    	            buffer += read();
    	            return
    	        }

    	        return newToken('numeric', sign * Number(buffer))
    	    },

    	    decimalPointLeading: function decimalPointLeading () {
    	        if (util.isDigit(c)) {
    	            buffer += read();
    	            lexState = 'decimalFraction';
    	            return
    	        }

    	        throw invalidChar(read())
    	    },

    	    decimalPoint: function decimalPoint () {
    	        switch (c) {
    	        case 'e':
    	        case 'E':
    	            buffer += read();
    	            lexState = 'decimalExponent';
    	            return
    	        }

    	        if (util.isDigit(c)) {
    	            buffer += read();
    	            lexState = 'decimalFraction';
    	            return
    	        }

    	        return newToken('numeric', sign * Number(buffer))
    	    },

    	    decimalFraction: function decimalFraction () {
    	        switch (c) {
    	        case 'e':
    	        case 'E':
    	            buffer += read();
    	            lexState = 'decimalExponent';
    	            return
    	        }

    	        if (util.isDigit(c)) {
    	            buffer += read();
    	            return
    	        }

    	        return newToken('numeric', sign * Number(buffer))
    	    },

    	    decimalExponent: function decimalExponent () {
    	        switch (c) {
    	        case '+':
    	        case '-':
    	            buffer += read();
    	            lexState = 'decimalExponentSign';
    	            return
    	        }

    	        if (util.isDigit(c)) {
    	            buffer += read();
    	            lexState = 'decimalExponentInteger';
    	            return
    	        }

    	        throw invalidChar(read())
    	    },

    	    decimalExponentSign: function decimalExponentSign () {
    	        if (util.isDigit(c)) {
    	            buffer += read();
    	            lexState = 'decimalExponentInteger';
    	            return
    	        }

    	        throw invalidChar(read())
    	    },

    	    decimalExponentInteger: function decimalExponentInteger () {
    	        if (util.isDigit(c)) {
    	            buffer += read();
    	            return
    	        }

    	        return newToken('numeric', sign * Number(buffer))
    	    },

    	    hexadecimal: function hexadecimal () {
    	        if (util.isHexDigit(c)) {
    	            buffer += read();
    	            lexState = 'hexadecimalInteger';
    	            return
    	        }

    	        throw invalidChar(read())
    	    },

    	    hexadecimalInteger: function hexadecimalInteger () {
    	        if (util.isHexDigit(c)) {
    	            buffer += read();
    	            return
    	        }

    	        return newToken('numeric', sign * Number(buffer))
    	    },

    	    string: function string () {
    	        switch (c) {
    	        case '\\':
    	            read();
    	            buffer += escape();
    	            return

    	        case '"':
    	            if (doubleQuote) {
    	                read();
    	                return newToken('string', buffer)
    	            }

    	            buffer += read();
    	            return

    	        case "'":
    	            if (!doubleQuote) {
    	                read();
    	                return newToken('string', buffer)
    	            }

    	            buffer += read();
    	            return

    	        case '\n':
    	        case '\r':
    	            throw invalidChar(read())

    	        case '\u2028':
    	        case '\u2029':
    	            separatorChar(c);
    	            break

    	        case undefined:
    	            throw invalidChar(read())
    	        }

    	        buffer += read();
    	    },

    	    start: function start () {
    	        switch (c) {
    	        case '{':
    	        case '[':
    	            return newToken('punctuator', read())

    	        // This code is unreachable since the default lexState handles eof.
    	        // case undefined:
    	        //     return newToken('eof')
    	        }

    	        lexState = 'value';
    	    },

    	    beforePropertyName: function beforePropertyName () {
    	        switch (c) {
    	        case '$':
    	        case '_':
    	            buffer = read();
    	            lexState = 'identifierName';
    	            return

    	        case '\\':
    	            read();
    	            lexState = 'identifierNameStartEscape';
    	            return

    	        case '}':
    	            return newToken('punctuator', read())

    	        case '"':
    	        case "'":
    	            doubleQuote = (read() === '"');
    	            lexState = 'string';
    	            return
    	        }

    	        if (util.isIdStartChar(c)) {
    	            buffer += read();
    	            lexState = 'identifierName';
    	            return
    	        }

    	        throw invalidChar(read())
    	    },

    	    afterPropertyName: function afterPropertyName () {
    	        if (c === ':') {
    	            return newToken('punctuator', read())
    	        }

    	        throw invalidChar(read())
    	    },

    	    beforePropertyValue: function beforePropertyValue () {
    	        lexState = 'value';
    	    },

    	    afterPropertyValue: function afterPropertyValue () {
    	        switch (c) {
    	        case ',':
    	        case '}':
    	            return newToken('punctuator', read())
    	        }

    	        throw invalidChar(read())
    	    },

    	    beforeArrayValue: function beforeArrayValue () {
    	        if (c === ']') {
    	            return newToken('punctuator', read())
    	        }

    	        lexState = 'value';
    	    },

    	    afterArrayValue: function afterArrayValue () {
    	        switch (c) {
    	        case ',':
    	        case ']':
    	            return newToken('punctuator', read())
    	        }

    	        throw invalidChar(read())
    	    },

    	    end: function end () {
    	        // This code is unreachable since it's handled by the default lexState.
    	        // if (c === undefined) {
    	        //     read()
    	        //     return newToken('eof')
    	        // }

    	        throw invalidChar(read())
    	    },
    	};

    	function newToken (type, value) {
    	    return {
    	        type: type,
    	        value: value,
    	        line: line,
    	        column: column,
    	    }
    	}

    	function literal (s) {
    	    for (var i = 0, list = s; i < list.length; i += 1) {
    	        var c = list[i];

    	        var p = peek();

    	        if (p !== c) {
    	            throw invalidChar(read())
    	        }

    	        read();
    	    }
    	}

    	function escape () {
    	    var c = peek();
    	    switch (c) {
    	    case 'b':
    	        read();
    	        return '\b'

    	    case 'f':
    	        read();
    	        return '\f'

    	    case 'n':
    	        read();
    	        return '\n'

    	    case 'r':
    	        read();
    	        return '\r'

    	    case 't':
    	        read();
    	        return '\t'

    	    case 'v':
    	        read();
    	        return '\v'

    	    case '0':
    	        read();
    	        if (util.isDigit(peek())) {
    	            throw invalidChar(read())
    	        }

    	        return '\0'

    	    case 'x':
    	        read();
    	        return hexEscape()

    	    case 'u':
    	        read();
    	        return unicodeEscape()

    	    case '\n':
    	    case '\u2028':
    	    case '\u2029':
    	        read();
    	        return ''

    	    case '\r':
    	        read();
    	        if (peek() === '\n') {
    	            read();
    	        }

    	        return ''

    	    case '1':
    	    case '2':
    	    case '3':
    	    case '4':
    	    case '5':
    	    case '6':
    	    case '7':
    	    case '8':
    	    case '9':
    	        throw invalidChar(read())

    	    case undefined:
    	        throw invalidChar(read())
    	    }

    	    return read()
    	}

    	function hexEscape () {
    	    var buffer = '';
    	    var c = peek();

    	    if (!util.isHexDigit(c)) {
    	        throw invalidChar(read())
    	    }

    	    buffer += read();

    	    c = peek();
    	    if (!util.isHexDigit(c)) {
    	        throw invalidChar(read())
    	    }

    	    buffer += read();

    	    return String.fromCodePoint(parseInt(buffer, 16))
    	}

    	function unicodeEscape () {
    	    var buffer = '';
    	    var count = 4;

    	    while (count-- > 0) {
    	        var c = peek();
    	        if (!util.isHexDigit(c)) {
    	            throw invalidChar(read())
    	        }

    	        buffer += read();
    	    }

    	    return String.fromCodePoint(parseInt(buffer, 16))
    	}

    	var parseStates = {
    	    start: function start () {
    	        if (token.type === 'eof') {
    	            throw invalidEOF()
    	        }

    	        push();
    	    },

    	    beforePropertyName: function beforePropertyName () {
    	        switch (token.type) {
    	        case 'identifier':
    	        case 'string':
    	            key = token.value;
    	            parseState = 'afterPropertyName';
    	            return

    	        case 'punctuator':
    	            // This code is unreachable since it's handled by the lexState.
    	            // if (token.value !== '}') {
    	            //     throw invalidToken()
    	            // }

    	            pop();
    	            return

    	        case 'eof':
    	            throw invalidEOF()
    	        }

    	        // This code is unreachable since it's handled by the lexState.
    	        // throw invalidToken()
    	    },

    	    afterPropertyName: function afterPropertyName () {
    	        // This code is unreachable since it's handled by the lexState.
    	        // if (token.type !== 'punctuator' || token.value !== ':') {
    	        //     throw invalidToken()
    	        // }

    	        if (token.type === 'eof') {
    	            throw invalidEOF()
    	        }

    	        parseState = 'beforePropertyValue';
    	    },

    	    beforePropertyValue: function beforePropertyValue () {
    	        if (token.type === 'eof') {
    	            throw invalidEOF()
    	        }

    	        push();
    	    },

    	    beforeArrayValue: function beforeArrayValue () {
    	        if (token.type === 'eof') {
    	            throw invalidEOF()
    	        }

    	        if (token.type === 'punctuator' && token.value === ']') {
    	            pop();
    	            return
    	        }

    	        push();
    	    },

    	    afterPropertyValue: function afterPropertyValue () {
    	        // This code is unreachable since it's handled by the lexState.
    	        // if (token.type !== 'punctuator') {
    	        //     throw invalidToken()
    	        // }

    	        if (token.type === 'eof') {
    	            throw invalidEOF()
    	        }

    	        switch (token.value) {
    	        case ',':
    	            parseState = 'beforePropertyName';
    	            return

    	        case '}':
    	            pop();
    	        }

    	        // This code is unreachable since it's handled by the lexState.
    	        // throw invalidToken()
    	    },

    	    afterArrayValue: function afterArrayValue () {
    	        // This code is unreachable since it's handled by the lexState.
    	        // if (token.type !== 'punctuator') {
    	        //     throw invalidToken()
    	        // }

    	        if (token.type === 'eof') {
    	            throw invalidEOF()
    	        }

    	        switch (token.value) {
    	        case ',':
    	            parseState = 'beforeArrayValue';
    	            return

    	        case ']':
    	            pop();
    	        }

    	        // This code is unreachable since it's handled by the lexState.
    	        // throw invalidToken()
    	    },

    	    end: function end () {
    	        // This code is unreachable since it's handled by the lexState.
    	        // if (token.type !== 'eof') {
    	        //     throw invalidToken()
    	        // }
    	    },
    	};

    	function push () {
    	    var value;

    	    switch (token.type) {
    	    case 'punctuator':
    	        switch (token.value) {
    	        case '{':
    	            value = {};
    	            break

    	        case '[':
    	            value = [];
    	            break
    	        }

    	        break

    	    case 'null':
    	    case 'boolean':
    	    case 'numeric':
    	    case 'string':
    	        value = token.value;
    	        break

    	    // This code is unreachable.
    	    // default:
    	    //     throw invalidToken()
    	    }

    	    if (root === undefined) {
    	        root = value;
    	    } else {
    	        var parent = stack[stack.length - 1];
    	        if (Array.isArray(parent)) {
    	            parent.push(value);
    	        } else {
    	            parent[key] = value;
    	        }
    	    }

    	    if (value !== null && typeof value === 'object') {
    	        stack.push(value);

    	        if (Array.isArray(value)) {
    	            parseState = 'beforeArrayValue';
    	        } else {
    	            parseState = 'beforePropertyName';
    	        }
    	    } else {
    	        var current = stack[stack.length - 1];
    	        if (current == null) {
    	            parseState = 'end';
    	        } else if (Array.isArray(current)) {
    	            parseState = 'afterArrayValue';
    	        } else {
    	            parseState = 'afterPropertyValue';
    	        }
    	    }
    	}

    	function pop () {
    	    stack.pop();

    	    var current = stack[stack.length - 1];
    	    if (current == null) {
    	        parseState = 'end';
    	    } else if (Array.isArray(current)) {
    	        parseState = 'afterArrayValue';
    	    } else {
    	        parseState = 'afterPropertyValue';
    	    }
    	}

    	// This code is unreachable.
    	// function invalidParseState () {
    	//     return new Error(`JSON5: invalid parse state '${parseState}'`)
    	// }

    	// This code is unreachable.
    	// function invalidLexState (state) {
    	//     return new Error(`JSON5: invalid lex state '${state}'`)
    	// }

    	function invalidChar (c) {
    	    if (c === undefined) {
    	        return syntaxError(("JSON5: invalid end of input at " + line + ":" + column))
    	    }

    	    return syntaxError(("JSON5: invalid character '" + (formatChar(c)) + "' at " + line + ":" + column))
    	}

    	function invalidEOF () {
    	    return syntaxError(("JSON5: invalid end of input at " + line + ":" + column))
    	}

    	// This code is unreachable.
    	// function invalidToken () {
    	//     if (token.type === 'eof') {
    	//         return syntaxError(`JSON5: invalid end of input at ${line}:${column}`)
    	//     }

    	//     const c = String.fromCodePoint(token.value.codePointAt(0))
    	//     return syntaxError(`JSON5: invalid character '${formatChar(c)}' at ${line}:${column}`)
    	// }

    	function invalidIdentifier () {
    	    column -= 5;
    	    return syntaxError(("JSON5: invalid identifier character at " + line + ":" + column))
    	}

    	function separatorChar (c) {
    	    console.warn(("JSON5: '" + (formatChar(c)) + "' in strings is not valid ECMAScript; consider escaping"));
    	}

    	function formatChar (c) {
    	    var replacements = {
    	        "'": "\\'",
    	        '"': '\\"',
    	        '\\': '\\\\',
    	        '\b': '\\b',
    	        '\f': '\\f',
    	        '\n': '\\n',
    	        '\r': '\\r',
    	        '\t': '\\t',
    	        '\v': '\\v',
    	        '\0': '\\0',
    	        '\u2028': '\\u2028',
    	        '\u2029': '\\u2029',
    	    };

    	    if (replacements[c]) {
    	        return replacements[c]
    	    }

    	    if (c < ' ') {
    	        var hexString = c.charCodeAt(0).toString(16);
    	        return '\\x' + ('00' + hexString).substring(hexString.length)
    	    }

    	    return c
    	}

    	function syntaxError (message) {
    	    var err = new SyntaxError(message);
    	    err.lineNumber = line;
    	    err.columnNumber = column;
    	    return err
    	}

    	var stringify = function stringify (value, replacer, space) {
    	    var stack = [];
    	    var indent = '';
    	    var propertyList;
    	    var replacerFunc;
    	    var gap = '';
    	    var quote;

    	    if (
    	        replacer != null &&
    	        typeof replacer === 'object' &&
    	        !Array.isArray(replacer)
    	    ) {
    	        space = replacer.space;
    	        quote = replacer.quote;
    	        replacer = replacer.replacer;
    	    }

    	    if (typeof replacer === 'function') {
    	        replacerFunc = replacer;
    	    } else if (Array.isArray(replacer)) {
    	        propertyList = [];
    	        for (var i = 0, list = replacer; i < list.length; i += 1) {
    	            var v = list[i];

    	            var item = (void 0);

    	            if (typeof v === 'string') {
    	                item = v;
    	            } else if (
    	                typeof v === 'number' ||
    	                v instanceof String ||
    	                v instanceof Number
    	            ) {
    	                item = String(v);
    	            }

    	            if (item !== undefined && propertyList.indexOf(item) < 0) {
    	                propertyList.push(item);
    	            }
    	        }
    	    }

    	    if (space instanceof Number) {
    	        space = Number(space);
    	    } else if (space instanceof String) {
    	        space = String(space);
    	    }

    	    if (typeof space === 'number') {
    	        if (space > 0) {
    	            space = Math.min(10, Math.floor(space));
    	            gap = '          '.substr(0, space);
    	        }
    	    } else if (typeof space === 'string') {
    	        gap = space.substr(0, 10);
    	    }

    	    return serializeProperty('', {'': value})

    	    function serializeProperty (key, holder) {
    	        var value = holder[key];
    	        if (value != null) {
    	            if (typeof value.toJSON5 === 'function') {
    	                value = value.toJSON5(key);
    	            } else if (typeof value.toJSON === 'function') {
    	                value = value.toJSON(key);
    	            }
    	        }

    	        if (replacerFunc) {
    	            value = replacerFunc.call(holder, key, value);
    	        }

    	        if (value instanceof Number) {
    	            value = Number(value);
    	        } else if (value instanceof String) {
    	            value = String(value);
    	        } else if (value instanceof Boolean) {
    	            value = value.valueOf();
    	        }

    	        switch (value) {
    	        case null: return 'null'
    	        case true: return 'true'
    	        case false: return 'false'
    	        }

    	        if (typeof value === 'string') {
    	            return quoteString(value)
    	        }

    	        if (typeof value === 'number') {
    	            return String(value)
    	        }

    	        if (typeof value === 'object') {
    	            return Array.isArray(value) ? serializeArray(value) : serializeObject(value)
    	        }

    	        return undefined
    	    }

    	    function quoteString (value) {
    	        var quotes = {
    	            "'": 0.1,
    	            '"': 0.2,
    	        };

    	        var replacements = {
    	            "'": "\\'",
    	            '"': '\\"',
    	            '\\': '\\\\',
    	            '\b': '\\b',
    	            '\f': '\\f',
    	            '\n': '\\n',
    	            '\r': '\\r',
    	            '\t': '\\t',
    	            '\v': '\\v',
    	            '\0': '\\0',
    	            '\u2028': '\\u2028',
    	            '\u2029': '\\u2029',
    	        };

    	        var product = '';

    	        for (var i = 0; i < value.length; i++) {
    	            var c = value[i];
    	            switch (c) {
    	            case "'":
    	            case '"':
    	                quotes[c]++;
    	                product += c;
    	                continue

    	            case '\0':
    	                if (util.isDigit(value[i + 1])) {
    	                    product += '\\x00';
    	                    continue
    	                }
    	            }

    	            if (replacements[c]) {
    	                product += replacements[c];
    	                continue
    	            }

    	            if (c < ' ') {
    	                var hexString = c.charCodeAt(0).toString(16);
    	                product += '\\x' + ('00' + hexString).substring(hexString.length);
    	                continue
    	            }

    	            product += c;
    	        }

    	        var quoteChar = quote || Object.keys(quotes).reduce(function (a, b) { return (quotes[a] < quotes[b]) ? a : b; });

    	        product = product.replace(new RegExp(quoteChar, 'g'), replacements[quoteChar]);

    	        return quoteChar + product + quoteChar
    	    }

    	    function serializeObject (value) {
    	        if (stack.indexOf(value) >= 0) {
    	            throw TypeError('Converting circular structure to JSON5')
    	        }

    	        stack.push(value);

    	        var stepback = indent;
    	        indent = indent + gap;

    	        var keys = propertyList || Object.keys(value);
    	        var partial = [];
    	        for (var i = 0, list = keys; i < list.length; i += 1) {
    	            var key = list[i];

    	            var propertyString = serializeProperty(key, value);
    	            if (propertyString !== undefined) {
    	                var member = serializeKey(key) + ':';
    	                if (gap !== '') {
    	                    member += ' ';
    	                }
    	                member += propertyString;
    	                partial.push(member);
    	            }
    	        }

    	        var final;
    	        if (partial.length === 0) {
    	            final = '{}';
    	        } else {
    	            var properties;
    	            if (gap === '') {
    	                properties = partial.join(',');
    	                final = '{' + properties + '}';
    	            } else {
    	                var separator = ',\n' + indent;
    	                properties = partial.join(separator);
    	                final = '{\n' + indent + properties + ',\n' + stepback + '}';
    	            }
    	        }

    	        stack.pop();
    	        indent = stepback;
    	        return final
    	    }

    	    function serializeKey (key) {
    	        if (key.length === 0) {
    	            return quoteString(key)
    	        }

    	        var firstChar = String.fromCodePoint(key.codePointAt(0));
    	        if (!util.isIdStartChar(firstChar)) {
    	            return quoteString(key)
    	        }

    	        for (var i = firstChar.length; i < key.length; i++) {
    	            if (!util.isIdContinueChar(String.fromCodePoint(key.codePointAt(i)))) {
    	                return quoteString(key)
    	            }
    	        }

    	        return key
    	    }

    	    function serializeArray (value) {
    	        if (stack.indexOf(value) >= 0) {
    	            throw TypeError('Converting circular structure to JSON5')
    	        }

    	        stack.push(value);

    	        var stepback = indent;
    	        indent = indent + gap;

    	        var partial = [];
    	        for (var i = 0; i < value.length; i++) {
    	            var propertyString = serializeProperty(String(i), value);
    	            partial.push((propertyString !== undefined) ? propertyString : 'null');
    	        }

    	        var final;
    	        if (partial.length === 0) {
    	            final = '[]';
    	        } else {
    	            if (gap === '') {
    	                var properties = partial.join(',');
    	                final = '[' + properties + ']';
    	            } else {
    	                var separator = ',\n' + indent;
    	                var properties$1 = partial.join(separator);
    	                final = '[\n' + indent + properties$1 + ',\n' + stepback + ']';
    	            }
    	        }

    	        stack.pop();
    	        indent = stepback;
    	        return final
    	    }
    	};

    	var JSON5 = {
    	    parse: parse,
    	    stringify: stringify,
    	};

    	var lib = JSON5;

    	var es5 = lib;

    	return es5;

    })));
    });

    /* src\core\Anki.svelte generated by Svelte v3.38.3 */

    class CAnki {
    	hideLoader() {
    		let loader = document.getElementById("loader");
    		loader.style.display = "none";
    	}

    	getCard() {
    		return ankiCard;
    	}

    	getConfig() {
    		try {
    			return dist.parse(ankiCard.config);
    		} catch(err) {
    			error(err);
    			return {};
    		}
    	}

    	showAnswer() {
    		
    	} //            AnkiDroidJS?.showAnswer();
    }

    const Anki = new CAnki();

    /* src\core\Helpers.svelte generated by Svelte v3.38.3 */

    function rand(min, max) {
    	min = Math.ceil(min);
    	max = Math.floor(max + 1);
    	return Math.floor(Math.random() * (max - min) + min);
    }

    function randFrom(arr) {
    	return arr[rand(0, arr.length - 1)];
    }

    function trueFalse() {
    	return rand(0, 1) == 0;
    }

    function randSign() {
    	return rand(0, 1) == 0 ? +1 : -1;
    }

    function pm(num) {
    	return num * (rand(0, 1) == 0 ? +1 : -1);
    }

    function shuffle(src) {
    	let dst = [...src];

    	for (let i = dst.length - 1; i > 0; i--) {
    		const j = Math.floor(Math.random() * (i + 1));
    		[dst[i], dst[j]] = [dst[j], dst[i]];
    	}

    	return dst;
    }

    new AudioContext();

    function run(task) {
    	setTimeout(task, 0);
    }

    function delay(ms) {
    	return new Promise(resolve => setTimeout(resolve, ms));
    }

    function range(start, end) {
    	return Array.from({ length: end - start }, (_, k) => k + start);
    }

    function splitNoEmpty(str, delim) {
    	return str.trim().split(delim !== null && delim !== void 0 ? delim : " ").filter(Boolean);
    }

    /* src\core\MathJax.svelte generated by Svelte v3.38.3 */

    var __awaiter$1 = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
    	function adopt(value) {
    		return value instanceof P
    		? value
    		: new P(function (resolve) {
    					resolve(value);
    				});
    	}

    	return new (P || (P = Promise))(function (resolve, reject) {
    			function fulfilled(value) {
    				try {
    					step(generator.next(value));
    				} catch(e) {
    					reject(e);
    				}
    			}

    			function rejected(value) {
    				try {
    					step(generator["throw"](value));
    				} catch(e) {
    					reject(e);
    				}
    			}

    			function step(result) {
    				result.done
    				? resolve(result.value)
    				: adopt(result.value).then(fulfilled, rejected);
    			}

    			step((generator = generator.apply(thisArg, _arguments || [])).next());
    		});
    };

    function refreshMath() {
    	function doIt() {
    		return __awaiter$1(this, void 0, void 0, function* () {
    			yield delay(2000);
    		}); //safe(() => MathJax.typeset());
    	}

    	run(doIt);
    }

    /* src\core\Mp3.svelte generated by Svelte v3.38.3 */

    const names = ["yes", "no", "done", "idle", "sound-on", "sound-off"];
    let _library = new Map();
    let _soundOn = true;

    function loadFrom(assetsFolder) {
    	function loadNext(folder, name, no) {
    		let fileName = folder === ""
    		? `${name}-${no}.mp3`
    		: `${folder}/${name}-${no}.mp3`;

    		let audio = new Audio(fileName);

    		audio.addEventListener(
    			"canplaythrough",
    			_ => {
    				// console.log(`loaded: ${fileName}`);
    				let tracks = _library.get(name);

    				tracks.push(audio);
    				run(() => loadNext(folder, name, no + 1));
    			},
    			{ once: true }
    		);
    	}

    	names.forEach(name => {
    		// console.log(`loading tracks of '${name}'`);
    		_library.set(name, []);

    		run(() => loadNext(assetsFolder, name, 1));
    	});
    }

    function play(name) {
    	let tracks = _library.get(name);
    	if (!tracks || tracks.length === 0) return;
    	let track = randFrom(tracks);

    	track.play().catch(err => {
    		
    	});
    }

    class CMp3 {
    	play(name) {
    		if (!_soundOn) return;
    		play(name);
    	}

    	buildMp3Library(assetsFolder, soundOn) {
    		_soundOn = soundOn;
    		run(() => loadFrom(""));
    		run(() => loadFrom(assetsFolder));
    	}

    	soundSwitch(soundOn) {
    		if (_soundOn === soundOn) return;
    		play(soundOn ? "sound-on" : "sound-off");
    		_soundOn = soundOn;
    	}

    	playRandom() {
    		if (!_soundOn) return;
    		play(randFrom(names));
    	}

    	get soundIsOn() {
    		return _soundOn;
    	}
    }

    const Mp3 = new CMp3();

    /* src\core\Pulse.svelte generated by Svelte v3.38.3 */

    var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
    	function adopt(value) {
    		return value instanceof P
    		? value
    		: new P(function (resolve) {
    					resolve(value);
    				});
    	}

    	return new (P || (P = Promise))(function (resolve, reject) {
    			function fulfilled(value) {
    				try {
    					step(generator.next(value));
    				} catch(e) {
    					reject(e);
    				}
    			}

    			function rejected(value) {
    				try {
    					step(generator["throw"](value));
    				} catch(e) {
    					reject(e);
    				}
    			}

    			function step(result) {
    				result.done
    				? resolve(result.value)
    				: adopt(result.value).then(fulfilled, rejected);
    			}

    			step((generator = generator.apply(thisArg, _arguments || [])).next());
    		});
    };

    let Config = {
    	duration: 500,
    	interval: 10000,
    	jitter: 7000
    };

    let zoomOut = [
    	{ transform: "scale(1, 1)" },
    	{ transform: "scale(1.03, 1.03)" },
    	{ transform: "scale(1, 1)" }
    ];

    let zoomIn = [
    	{ transform: "scale(1, 1)" },
    	{ transform: "scale(0.98, 0.98)" },
    	{ transform: "scale(1, 1)" }
    ];

    let xShift = [
    	{ transform: "translate(0px, 0px)" },
    	{ transform: "translate(-1px, 0px)" },
    	{ transform: "translate(+1px, 0px)" },
    	{ transform: "translate(0px, 0px)" }
    ];

    let yShift = [
    	{ transform: "translate(0px, 0px)" },
    	{ transform: "translate(0px, -1px)" },
    	{ transform: "translate(0px, +1px)" },
    	{ transform: "translate(0px, 0px)" }
    ];

    let xyShift = [
    	{ transform: "translate(0px, 0px)" },
    	{ transform: "translate(-1px, -1px)" },
    	{ transform: "translate(+1px, +1px)" },
    	{ transform: "translate(0px, 0px)" }
    ];

    let yxShift = [
    	{ transform: "translate(0px, 0px)" },
    	{ transform: "translate(+1px, -1px)" },
    	{ transform: "translate(-1px, +1px)" },
    	{ transform: "translate(0px, 0px)" }
    ];

    let rotate = [
    	{ transform: "rotate(0deg)" },
    	{ transform: "rotate(-2deg)" },
    	{ transform: "rotate(+2deg)" },
    	{ transform: "rotate(0deg)" }
    ];

    let pulses = [zoomOut, zoomIn, xShift, yShift, xyShift, yxShift, rotate];

    function startPulsing(elem, config) {
    	return __awaiter(this, void 0, void 0, function* () {
    		for (; ; ) {
    			let { interval, jitter, duration } = config;
    			let timeout = rand(interval - jitter, interval + jitter);
    			yield delay(timeout);
    			let pulse = randFrom(pulses);
    			elem.animate(pulse, duration);
    		}
    	});
    }

    function pulse(elem, config) {
    	run(() => startPulsing(elem, config !== null && config !== void 0 ? config : Config));
    }

    /* src\core\Clock.svelte generated by Svelte v3.38.3 */
    const file$g = "src\\core\\Clock.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (48:2) {#each [1, 2, 3, 4] as offset}
    function create_each_block_1(ctx) {
    	let line;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			attr_dev(line, "class", "minor svelte-drk22q");
    			attr_dev(line, "y1", "42");
    			attr_dev(line, "y2", "45");
    			attr_dev(line, "transform", "rotate(" + 6 * (/*minute*/ ctx[7] + /*offset*/ ctx[10]) + ")");
    			add_location(line, file$g, 48, 3, 1074);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(48:2) {#each [1, 2, 3, 4] as offset}",
    		ctx
    	});

    	return block;
    }

    // (40:1) {#each [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as minute}
    function create_each_block$3(ctx) {
    	let line;
    	let each_1_anchor;
    	let each_value_1 = [1, 2, 3, 4];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < 4; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			line = svg_element("line");

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(line, "class", "major svelte-drk22q");
    			attr_dev(line, "y1", "35");
    			attr_dev(line, "y2", "45");
    			attr_dev(line, "transform", "rotate(" + 30 * /*minute*/ ctx[7] + ")");
    			add_location(line, file$g, 40, 2, 942);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(40:1) {#each [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as minute}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$j(ctx) {
    	let svg;
    	let circle;
    	let circle_class_value;
    	let line0;
    	let line0_transform_value;
    	let line1;
    	let line1_transform_value;
    	let g;
    	let line2;
    	let line3;
    	let g_transform_value;
    	let mounted;
    	let dispose;
    	let each_value = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < 12; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			circle = svg_element("circle");

    			for (let i = 0; i < 12; i += 1) {
    				each_blocks[i].c();
    			}

    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			g = svg_element("g");
    			line2 = svg_element("line");
    			line3 = svg_element("line");

    			attr_dev(circle, "class", circle_class_value = "" + (null_to_empty(/*soundOn*/ ctx[1]
    			? "clock-face-enabled"
    			: "clock-face-disabled") + " svelte-drk22q"));

    			attr_dev(circle, "r", "48");
    			add_location(circle, file$g, 36, 1, 771);
    			attr_dev(line0, "class", "hour svelte-drk22q");
    			attr_dev(line0, "y1", "2");
    			attr_dev(line0, "y2", "-20");
    			attr_dev(line0, "transform", line0_transform_value = "rotate(" + (30 * /*hours*/ ctx[2] + /*minutes*/ ctx[3] / 2) + ")");
    			add_location(line0, file$g, 58, 1, 1227);
    			attr_dev(line1, "class", "minute svelte-drk22q");
    			attr_dev(line1, "y1", "4");
    			attr_dev(line1, "y2", "-30");
    			attr_dev(line1, "transform", line1_transform_value = "rotate(" + (6 * /*minutes*/ ctx[3] + /*seconds*/ ctx[4] / 10) + ")");
    			add_location(line1, file$g, 66, 1, 1353);
    			attr_dev(line2, "class", "second svelte-drk22q");
    			attr_dev(line2, "y1", "10");
    			attr_dev(line2, "y2", "-38");
    			add_location(line2, file$g, 75, 2, 1524);
    			attr_dev(line3, "class", "second-counterweight svelte-drk22q");
    			attr_dev(line3, "y1", "10");
    			attr_dev(line3, "y2", "2");
    			add_location(line3, file$g, 76, 2, 1567);
    			attr_dev(g, "transform", g_transform_value = "rotate(" + 6 * /*seconds*/ ctx[4] + ")");
    			add_location(g, file$g, 74, 1, 1483);
    			attr_dev(svg, "viewBox", "-50 -50 100 100");
    			set_style(svg, "grid-area", /*ga*/ ctx[0]);
    			attr_dev(svg, "class", "svelte-drk22q");
    			add_location(svg, file$g, 32, 0, 669);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, circle);

    			for (let i = 0; i < 12; i += 1) {
    				each_blocks[i].m(svg, null);
    			}

    			append_dev(svg, line0);
    			append_dev(svg, line1);
    			append_dev(svg, g);
    			append_dev(g, line2);
    			append_dev(g, line3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "click", /*soundSwitch*/ ctx[5], false, false, false),
    					action_destroyer(pulse.call(null, svg))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*soundOn*/ 2 && circle_class_value !== (circle_class_value = "" + (null_to_empty(/*soundOn*/ ctx[1]
    			? "clock-face-enabled"
    			: "clock-face-disabled") + " svelte-drk22q"))) {
    				attr_dev(circle, "class", circle_class_value);
    			}

    			if (dirty & /*hours, minutes*/ 12 && line0_transform_value !== (line0_transform_value = "rotate(" + (30 * /*hours*/ ctx[2] + /*minutes*/ ctx[3] / 2) + ")")) {
    				attr_dev(line0, "transform", line0_transform_value);
    			}

    			if (dirty & /*minutes, seconds*/ 24 && line1_transform_value !== (line1_transform_value = "rotate(" + (6 * /*minutes*/ ctx[3] + /*seconds*/ ctx[4] / 10) + ")")) {
    				attr_dev(line1, "transform", line1_transform_value);
    			}

    			if (dirty & /*seconds*/ 16 && g_transform_value !== (g_transform_value = "rotate(" + 6 * /*seconds*/ ctx[4] + ")")) {
    				attr_dev(g, "transform", g_transform_value);
    			}

    			if (dirty & /*ga*/ 1) {
    				set_style(svg, "grid-area", /*ga*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let hours;
    	let minutes;
    	let seconds;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Clock", slots, []);
    	let { ga } = $$props;
    	let soundOn = Mp3.soundIsOn;
    	let time = new Date();

    	onMount(() => {
    		const interval = setInterval(
    			() => {
    				$$invalidate(6, time = new Date());
    			},
    			1000
    		);

    		return () => {
    			clearInterval(interval);
    		};
    	});

    	function soundSwitch() {
    		$$invalidate(1, soundOn ^= true);
    		Mp3.soundSwitch(soundOn);
    	}

    	const writable_props = ["ga"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Clock> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		pulse,
    		Mp3,
    		ga,
    		soundOn,
    		time,
    		soundSwitch,
    		hours,
    		minutes,
    		seconds
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("soundOn" in $$props) $$invalidate(1, soundOn = $$props.soundOn);
    		if ("time" in $$props) $$invalidate(6, time = $$props.time);
    		if ("hours" in $$props) $$invalidate(2, hours = $$props.hours);
    		if ("minutes" in $$props) $$invalidate(3, minutes = $$props.minutes);
    		if ("seconds" in $$props) $$invalidate(4, seconds = $$props.seconds);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*time*/ 64) {
    			// these automatically update when `time`
    			// changes, because of the `$:` prefix
    			$$invalidate(2, hours = time.getHours());
    		}

    		if ($$self.$$.dirty & /*time*/ 64) {
    			$$invalidate(3, minutes = time.getMinutes());
    		}

    		if ($$self.$$.dirty & /*time*/ 64) {
    			$$invalidate(4, seconds = time.getSeconds());
    		}
    	};

    	return [ga, soundOn, hours, minutes, seconds, soundSwitch, time];
    }

    class Clock extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, { ga: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Clock",
    			options,
    			id: create_fragment$j.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Clock> was created without expected prop 'ga'");
    		}
    	}

    	get ga() {
    		throw new Error("<Clock>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Clock>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /*
     * anime.js v3.2.1
     * (c) 2020 Julian Garnier
     * Released under the MIT license
     * animejs.com
     */

    // Defaults

    var defaultInstanceSettings = {
      update: null,
      begin: null,
      loopBegin: null,
      changeBegin: null,
      change: null,
      changeComplete: null,
      loopComplete: null,
      complete: null,
      loop: 1,
      direction: 'normal',
      autoplay: true,
      timelineOffset: 0
    };

    var defaultTweenSettings = {
      duration: 1000,
      delay: 0,
      endDelay: 0,
      easing: 'easeOutElastic(1, .5)',
      round: 0
    };

    var validTransforms = ['translateX', 'translateY', 'translateZ', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'scale', 'scaleX', 'scaleY', 'scaleZ', 'skew', 'skewX', 'skewY', 'perspective', 'matrix', 'matrix3d'];

    // Caching

    var cache = {
      CSS: {},
      springs: {}
    };

    // Utils

    function minMax(val, min, max) {
      return Math.min(Math.max(val, min), max);
    }

    function stringContains(str, text) {
      return str.indexOf(text) > -1;
    }

    function applyArguments(func, args) {
      return func.apply(null, args);
    }

    var is = {
      arr: function (a) { return Array.isArray(a); },
      obj: function (a) { return stringContains(Object.prototype.toString.call(a), 'Object'); },
      pth: function (a) { return is.obj(a) && a.hasOwnProperty('totalLength'); },
      svg: function (a) { return a instanceof SVGElement; },
      inp: function (a) { return a instanceof HTMLInputElement; },
      dom: function (a) { return a.nodeType || is.svg(a); },
      str: function (a) { return typeof a === 'string'; },
      fnc: function (a) { return typeof a === 'function'; },
      und: function (a) { return typeof a === 'undefined'; },
      nil: function (a) { return is.und(a) || a === null; },
      hex: function (a) { return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(a); },
      rgb: function (a) { return /^rgb/.test(a); },
      hsl: function (a) { return /^hsl/.test(a); },
      col: function (a) { return (is.hex(a) || is.rgb(a) || is.hsl(a)); },
      key: function (a) { return !defaultInstanceSettings.hasOwnProperty(a) && !defaultTweenSettings.hasOwnProperty(a) && a !== 'targets' && a !== 'keyframes'; },
    };

    // Easings

    function parseEasingParameters(string) {
      var match = /\(([^)]+)\)/.exec(string);
      return match ? match[1].split(',').map(function (p) { return parseFloat(p); }) : [];
    }

    // Spring solver inspired by Webkit Copyright © 2016 Apple Inc. All rights reserved. https://webkit.org/demos/spring/spring.js

    function spring(string, duration) {

      var params = parseEasingParameters(string);
      var mass = minMax(is.und(params[0]) ? 1 : params[0], .1, 100);
      var stiffness = minMax(is.und(params[1]) ? 100 : params[1], .1, 100);
      var damping = minMax(is.und(params[2]) ? 10 : params[2], .1, 100);
      var velocity =  minMax(is.und(params[3]) ? 0 : params[3], .1, 100);
      var w0 = Math.sqrt(stiffness / mass);
      var zeta = damping / (2 * Math.sqrt(stiffness * mass));
      var wd = zeta < 1 ? w0 * Math.sqrt(1 - zeta * zeta) : 0;
      var a = 1;
      var b = zeta < 1 ? (zeta * w0 + -velocity) / wd : -velocity + w0;

      function solver(t) {
        var progress = duration ? (duration * t) / 1000 : t;
        if (zeta < 1) {
          progress = Math.exp(-progress * zeta * w0) * (a * Math.cos(wd * progress) + b * Math.sin(wd * progress));
        } else {
          progress = (a + b * progress) * Math.exp(-progress * w0);
        }
        if (t === 0 || t === 1) { return t; }
        return 1 - progress;
      }

      function getDuration() {
        var cached = cache.springs[string];
        if (cached) { return cached; }
        var frame = 1/6;
        var elapsed = 0;
        var rest = 0;
        while(true) {
          elapsed += frame;
          if (solver(elapsed) === 1) {
            rest++;
            if (rest >= 16) { break; }
          } else {
            rest = 0;
          }
        }
        var duration = elapsed * frame * 1000;
        cache.springs[string] = duration;
        return duration;
      }

      return duration ? solver : getDuration;

    }

    // Basic steps easing implementation https://developer.mozilla.org/fr/docs/Web/CSS/transition-timing-function

    function steps(steps) {
      if ( steps === void 0 ) steps = 10;

      return function (t) { return Math.ceil((minMax(t, 0.000001, 1)) * steps) * (1 / steps); };
    }

    // BezierEasing https://github.com/gre/bezier-easing

    var bezier = (function () {

      var kSplineTableSize = 11;
      var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

      function A(aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1 }
      function B(aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1 }
      function C(aA1)      { return 3.0 * aA1 }

      function calcBezier(aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT }
      function getSlope(aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1) }

      function binarySubdivide(aX, aA, aB, mX1, mX2) {
        var currentX, currentT, i = 0;
        do {
          currentT = aA + (aB - aA) / 2.0;
          currentX = calcBezier(currentT, mX1, mX2) - aX;
          if (currentX > 0.0) { aB = currentT; } else { aA = currentT; }
        } while (Math.abs(currentX) > 0.0000001 && ++i < 10);
        return currentT;
      }

      function newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
        for (var i = 0; i < 4; ++i) {
          var currentSlope = getSlope(aGuessT, mX1, mX2);
          if (currentSlope === 0.0) { return aGuessT; }
          var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
          aGuessT -= currentX / currentSlope;
        }
        return aGuessT;
      }

      function bezier(mX1, mY1, mX2, mY2) {

        if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) { return; }
        var sampleValues = new Float32Array(kSplineTableSize);

        if (mX1 !== mY1 || mX2 !== mY2) {
          for (var i = 0; i < kSplineTableSize; ++i) {
            sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
          }
        }

        function getTForX(aX) {

          var intervalStart = 0;
          var currentSample = 1;
          var lastSample = kSplineTableSize - 1;

          for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
            intervalStart += kSampleStepSize;
          }

          --currentSample;

          var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
          var guessForT = intervalStart + dist * kSampleStepSize;
          var initialSlope = getSlope(guessForT, mX1, mX2);

          if (initialSlope >= 0.001) {
            return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
          } else if (initialSlope === 0.0) {
            return guessForT;
          } else {
            return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
          }

        }

        return function (x) {
          if (mX1 === mY1 && mX2 === mY2) { return x; }
          if (x === 0 || x === 1) { return x; }
          return calcBezier(getTForX(x), mY1, mY2);
        }

      }

      return bezier;

    })();

    var penner = (function () {

      // Based on jQuery UI's implemenation of easing equations from Robert Penner (http://www.robertpenner.com/easing)

      var eases = { linear: function () { return function (t) { return t; }; } };

      var functionEasings = {
        Sine: function () { return function (t) { return 1 - Math.cos(t * Math.PI / 2); }; },
        Circ: function () { return function (t) { return 1 - Math.sqrt(1 - t * t); }; },
        Back: function () { return function (t) { return t * t * (3 * t - 2); }; },
        Bounce: function () { return function (t) {
          var pow2, b = 4;
          while (t < (( pow2 = Math.pow(2, --b)) - 1) / 11) {}
          return 1 / Math.pow(4, 3 - b) - 7.5625 * Math.pow(( pow2 * 3 - 2 ) / 22 - t, 2)
        }; },
        Elastic: function (amplitude, period) {
          if ( amplitude === void 0 ) amplitude = 1;
          if ( period === void 0 ) period = .5;

          var a = minMax(amplitude, 1, 10);
          var p = minMax(period, .1, 2);
          return function (t) {
            return (t === 0 || t === 1) ? t : 
              -a * Math.pow(2, 10 * (t - 1)) * Math.sin((((t - 1) - (p / (Math.PI * 2) * Math.asin(1 / a))) * (Math.PI * 2)) / p);
          }
        }
      };

      var baseEasings = ['Quad', 'Cubic', 'Quart', 'Quint', 'Expo'];

      baseEasings.forEach(function (name, i) {
        functionEasings[name] = function () { return function (t) { return Math.pow(t, i + 2); }; };
      });

      Object.keys(functionEasings).forEach(function (name) {
        var easeIn = functionEasings[name];
        eases['easeIn' + name] = easeIn;
        eases['easeOut' + name] = function (a, b) { return function (t) { return 1 - easeIn(a, b)(1 - t); }; };
        eases['easeInOut' + name] = function (a, b) { return function (t) { return t < 0.5 ? easeIn(a, b)(t * 2) / 2 : 
          1 - easeIn(a, b)(t * -2 + 2) / 2; }; };
        eases['easeOutIn' + name] = function (a, b) { return function (t) { return t < 0.5 ? (1 - easeIn(a, b)(1 - t * 2)) / 2 : 
          (easeIn(a, b)(t * 2 - 1) + 1) / 2; }; };
      });

      return eases;

    })();

    function parseEasings(easing, duration) {
      if (is.fnc(easing)) { return easing; }
      var name = easing.split('(')[0];
      var ease = penner[name];
      var args = parseEasingParameters(easing);
      switch (name) {
        case 'spring' : return spring(easing, duration);
        case 'cubicBezier' : return applyArguments(bezier, args);
        case 'steps' : return applyArguments(steps, args);
        default : return applyArguments(ease, args);
      }
    }

    // Strings

    function selectString(str) {
      try {
        var nodes = document.querySelectorAll(str);
        return nodes;
      } catch(e) {
        return;
      }
    }

    // Arrays

    function filterArray(arr, callback) {
      var len = arr.length;
      var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
      var result = [];
      for (var i = 0; i < len; i++) {
        if (i in arr) {
          var val = arr[i];
          if (callback.call(thisArg, val, i, arr)) {
            result.push(val);
          }
        }
      }
      return result;
    }

    function flattenArray(arr) {
      return arr.reduce(function (a, b) { return a.concat(is.arr(b) ? flattenArray(b) : b); }, []);
    }

    function toArray(o) {
      if (is.arr(o)) { return o; }
      if (is.str(o)) { o = selectString(o) || o; }
      if (o instanceof NodeList || o instanceof HTMLCollection) { return [].slice.call(o); }
      return [o];
    }

    function arrayContains(arr, val) {
      return arr.some(function (a) { return a === val; });
    }

    // Objects

    function cloneObject(o) {
      var clone = {};
      for (var p in o) { clone[p] = o[p]; }
      return clone;
    }

    function replaceObjectProps(o1, o2) {
      var o = cloneObject(o1);
      for (var p in o1) { o[p] = o2.hasOwnProperty(p) ? o2[p] : o1[p]; }
      return o;
    }

    function mergeObjects(o1, o2) {
      var o = cloneObject(o1);
      for (var p in o2) { o[p] = is.und(o1[p]) ? o2[p] : o1[p]; }
      return o;
    }

    // Colors

    function rgbToRgba(rgbValue) {
      var rgb = /rgb\((\d+,\s*[\d]+,\s*[\d]+)\)/g.exec(rgbValue);
      return rgb ? ("rgba(" + (rgb[1]) + ",1)") : rgbValue;
    }

    function hexToRgba(hexValue) {
      var rgx = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      var hex = hexValue.replace(rgx, function (m, r, g, b) { return r + r + g + g + b + b; } );
      var rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      var r = parseInt(rgb[1], 16);
      var g = parseInt(rgb[2], 16);
      var b = parseInt(rgb[3], 16);
      return ("rgba(" + r + "," + g + "," + b + ",1)");
    }

    function hslToRgba(hslValue) {
      var hsl = /hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(hslValue) || /hsla\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)/g.exec(hslValue);
      var h = parseInt(hsl[1], 10) / 360;
      var s = parseInt(hsl[2], 10) / 100;
      var l = parseInt(hsl[3], 10) / 100;
      var a = hsl[4] || 1;
      function hue2rgb(p, q, t) {
        if (t < 0) { t += 1; }
        if (t > 1) { t -= 1; }
        if (t < 1/6) { return p + (q - p) * 6 * t; }
        if (t < 1/2) { return q; }
        if (t < 2/3) { return p + (q - p) * (2/3 - t) * 6; }
        return p;
      }
      var r, g, b;
      if (s == 0) {
        r = g = b = l;
      } else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return ("rgba(" + (r * 255) + "," + (g * 255) + "," + (b * 255) + "," + a + ")");
    }

    function colorToRgb(val) {
      if (is.rgb(val)) { return rgbToRgba(val); }
      if (is.hex(val)) { return hexToRgba(val); }
      if (is.hsl(val)) { return hslToRgba(val); }
    }

    // Units

    function getUnit(val) {
      var split = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(%|px|pt|em|rem|in|cm|mm|ex|ch|pc|vw|vh|vmin|vmax|deg|rad|turn)?$/.exec(val);
      if (split) { return split[1]; }
    }

    function getTransformUnit(propName) {
      if (stringContains(propName, 'translate') || propName === 'perspective') { return 'px'; }
      if (stringContains(propName, 'rotate') || stringContains(propName, 'skew')) { return 'deg'; }
    }

    // Values

    function getFunctionValue(val, animatable) {
      if (!is.fnc(val)) { return val; }
      return val(animatable.target, animatable.id, animatable.total);
    }

    function getAttribute(el, prop) {
      return el.getAttribute(prop);
    }

    function convertPxToUnit(el, value, unit) {
      var valueUnit = getUnit(value);
      if (arrayContains([unit, 'deg', 'rad', 'turn'], valueUnit)) { return value; }
      var cached = cache.CSS[value + unit];
      if (!is.und(cached)) { return cached; }
      var baseline = 100;
      var tempEl = document.createElement(el.tagName);
      var parentEl = (el.parentNode && (el.parentNode !== document)) ? el.parentNode : document.body;
      parentEl.appendChild(tempEl);
      tempEl.style.position = 'absolute';
      tempEl.style.width = baseline + unit;
      var factor = baseline / tempEl.offsetWidth;
      parentEl.removeChild(tempEl);
      var convertedUnit = factor * parseFloat(value);
      cache.CSS[value + unit] = convertedUnit;
      return convertedUnit;
    }

    function getCSSValue(el, prop, unit) {
      if (prop in el.style) {
        var uppercasePropName = prop.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        var value = el.style[prop] || getComputedStyle(el).getPropertyValue(uppercasePropName) || '0';
        return unit ? convertPxToUnit(el, value, unit) : value;
      }
    }

    function getAnimationType(el, prop) {
      if (is.dom(el) && !is.inp(el) && (!is.nil(getAttribute(el, prop)) || (is.svg(el) && el[prop]))) { return 'attribute'; }
      if (is.dom(el) && arrayContains(validTransforms, prop)) { return 'transform'; }
      if (is.dom(el) && (prop !== 'transform' && getCSSValue(el, prop))) { return 'css'; }
      if (el[prop] != null) { return 'object'; }
    }

    function getElementTransforms(el) {
      if (!is.dom(el)) { return; }
      var str = el.style.transform || '';
      var reg  = /(\w+)\(([^)]*)\)/g;
      var transforms = new Map();
      var m; while (m = reg.exec(str)) { transforms.set(m[1], m[2]); }
      return transforms;
    }

    function getTransformValue(el, propName, animatable, unit) {
      var defaultVal = stringContains(propName, 'scale') ? 1 : 0 + getTransformUnit(propName);
      var value = getElementTransforms(el).get(propName) || defaultVal;
      if (animatable) {
        animatable.transforms.list.set(propName, value);
        animatable.transforms['last'] = propName;
      }
      return unit ? convertPxToUnit(el, value, unit) : value;
    }

    function getOriginalTargetValue(target, propName, unit, animatable) {
      switch (getAnimationType(target, propName)) {
        case 'transform': return getTransformValue(target, propName, animatable, unit);
        case 'css': return getCSSValue(target, propName, unit);
        case 'attribute': return getAttribute(target, propName);
        default: return target[propName] || 0;
      }
    }

    function getRelativeValue(to, from) {
      var operator = /^(\*=|\+=|-=)/.exec(to);
      if (!operator) { return to; }
      var u = getUnit(to) || 0;
      var x = parseFloat(from);
      var y = parseFloat(to.replace(operator[0], ''));
      switch (operator[0][0]) {
        case '+': return x + y + u;
        case '-': return x - y + u;
        case '*': return x * y + u;
      }
    }

    function validateValue(val, unit) {
      if (is.col(val)) { return colorToRgb(val); }
      if (/\s/g.test(val)) { return val; }
      var originalUnit = getUnit(val);
      var unitLess = originalUnit ? val.substr(0, val.length - originalUnit.length) : val;
      if (unit) { return unitLess + unit; }
      return unitLess;
    }

    // getTotalLength() equivalent for circle, rect, polyline, polygon and line shapes
    // adapted from https://gist.github.com/SebLambla/3e0550c496c236709744

    function getDistance(p1, p2) {
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    function getCircleLength(el) {
      return Math.PI * 2 * getAttribute(el, 'r');
    }

    function getRectLength(el) {
      return (getAttribute(el, 'width') * 2) + (getAttribute(el, 'height') * 2);
    }

    function getLineLength(el) {
      return getDistance(
        {x: getAttribute(el, 'x1'), y: getAttribute(el, 'y1')}, 
        {x: getAttribute(el, 'x2'), y: getAttribute(el, 'y2')}
      );
    }

    function getPolylineLength(el) {
      var points = el.points;
      var totalLength = 0;
      var previousPos;
      for (var i = 0 ; i < points.numberOfItems; i++) {
        var currentPos = points.getItem(i);
        if (i > 0) { totalLength += getDistance(previousPos, currentPos); }
        previousPos = currentPos;
      }
      return totalLength;
    }

    function getPolygonLength(el) {
      var points = el.points;
      return getPolylineLength(el) + getDistance(points.getItem(points.numberOfItems - 1), points.getItem(0));
    }

    // Path animation

    function getTotalLength(el) {
      if (el.getTotalLength) { return el.getTotalLength(); }
      switch(el.tagName.toLowerCase()) {
        case 'circle': return getCircleLength(el);
        case 'rect': return getRectLength(el);
        case 'line': return getLineLength(el);
        case 'polyline': return getPolylineLength(el);
        case 'polygon': return getPolygonLength(el);
      }
    }

    function setDashoffset(el) {
      var pathLength = getTotalLength(el);
      el.setAttribute('stroke-dasharray', pathLength);
      return pathLength;
    }

    // Motion path

    function getParentSvgEl(el) {
      var parentEl = el.parentNode;
      while (is.svg(parentEl)) {
        if (!is.svg(parentEl.parentNode)) { break; }
        parentEl = parentEl.parentNode;
      }
      return parentEl;
    }

    function getParentSvg(pathEl, svgData) {
      var svg = svgData || {};
      var parentSvgEl = svg.el || getParentSvgEl(pathEl);
      var rect = parentSvgEl.getBoundingClientRect();
      var viewBoxAttr = getAttribute(parentSvgEl, 'viewBox');
      var width = rect.width;
      var height = rect.height;
      var viewBox = svg.viewBox || (viewBoxAttr ? viewBoxAttr.split(' ') : [0, 0, width, height]);
      return {
        el: parentSvgEl,
        viewBox: viewBox,
        x: viewBox[0] / 1,
        y: viewBox[1] / 1,
        w: width,
        h: height,
        vW: viewBox[2],
        vH: viewBox[3]
      }
    }

    function getPath(path, percent) {
      var pathEl = is.str(path) ? selectString(path)[0] : path;
      var p = percent || 100;
      return function(property) {
        return {
          property: property,
          el: pathEl,
          svg: getParentSvg(pathEl),
          totalLength: getTotalLength(pathEl) * (p / 100)
        }
      }
    }

    function getPathProgress(path, progress, isPathTargetInsideSVG) {
      function point(offset) {
        if ( offset === void 0 ) offset = 0;

        var l = progress + offset >= 1 ? progress + offset : 0;
        return path.el.getPointAtLength(l);
      }
      var svg = getParentSvg(path.el, path.svg);
      var p = point();
      var p0 = point(-1);
      var p1 = point(+1);
      var scaleX = isPathTargetInsideSVG ? 1 : svg.w / svg.vW;
      var scaleY = isPathTargetInsideSVG ? 1 : svg.h / svg.vH;
      switch (path.property) {
        case 'x': return (p.x - svg.x) * scaleX;
        case 'y': return (p.y - svg.y) * scaleY;
        case 'angle': return Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
      }
    }

    // Decompose value

    function decomposeValue(val, unit) {
      // const rgx = /-?\d*\.?\d+/g; // handles basic numbers
      // const rgx = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
      var rgx = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
      var value = validateValue((is.pth(val) ? val.totalLength : val), unit) + '';
      return {
        original: value,
        numbers: value.match(rgx) ? value.match(rgx).map(Number) : [0],
        strings: (is.str(val) || unit) ? value.split(rgx) : []
      }
    }

    // Animatables

    function parseTargets(targets) {
      var targetsArray = targets ? (flattenArray(is.arr(targets) ? targets.map(toArray) : toArray(targets))) : [];
      return filterArray(targetsArray, function (item, pos, self) { return self.indexOf(item) === pos; });
    }

    function getAnimatables(targets) {
      var parsed = parseTargets(targets);
      return parsed.map(function (t, i) {
        return {target: t, id: i, total: parsed.length, transforms: { list: getElementTransforms(t) } };
      });
    }

    // Properties

    function normalizePropertyTweens(prop, tweenSettings) {
      var settings = cloneObject(tweenSettings);
      // Override duration if easing is a spring
      if (/^spring/.test(settings.easing)) { settings.duration = spring(settings.easing); }
      if (is.arr(prop)) {
        var l = prop.length;
        var isFromTo = (l === 2 && !is.obj(prop[0]));
        if (!isFromTo) {
          // Duration divided by the number of tweens
          if (!is.fnc(tweenSettings.duration)) { settings.duration = tweenSettings.duration / l; }
        } else {
          // Transform [from, to] values shorthand to a valid tween value
          prop = {value: prop};
        }
      }
      var propArray = is.arr(prop) ? prop : [prop];
      return propArray.map(function (v, i) {
        var obj = (is.obj(v) && !is.pth(v)) ? v : {value: v};
        // Default delay value should only be applied to the first tween
        if (is.und(obj.delay)) { obj.delay = !i ? tweenSettings.delay : 0; }
        // Default endDelay value should only be applied to the last tween
        if (is.und(obj.endDelay)) { obj.endDelay = i === propArray.length - 1 ? tweenSettings.endDelay : 0; }
        return obj;
      }).map(function (k) { return mergeObjects(k, settings); });
    }


    function flattenKeyframes(keyframes) {
      var propertyNames = filterArray(flattenArray(keyframes.map(function (key) { return Object.keys(key); })), function (p) { return is.key(p); })
      .reduce(function (a,b) { if (a.indexOf(b) < 0) { a.push(b); } return a; }, []);
      var properties = {};
      var loop = function ( i ) {
        var propName = propertyNames[i];
        properties[propName] = keyframes.map(function (key) {
          var newKey = {};
          for (var p in key) {
            if (is.key(p)) {
              if (p == propName) { newKey.value = key[p]; }
            } else {
              newKey[p] = key[p];
            }
          }
          return newKey;
        });
      };

      for (var i = 0; i < propertyNames.length; i++) loop( i );
      return properties;
    }

    function getProperties(tweenSettings, params) {
      var properties = [];
      var keyframes = params.keyframes;
      if (keyframes) { params = mergeObjects(flattenKeyframes(keyframes), params); }
      for (var p in params) {
        if (is.key(p)) {
          properties.push({
            name: p,
            tweens: normalizePropertyTweens(params[p], tweenSettings)
          });
        }
      }
      return properties;
    }

    // Tweens

    function normalizeTweenValues(tween, animatable) {
      var t = {};
      for (var p in tween) {
        var value = getFunctionValue(tween[p], animatable);
        if (is.arr(value)) {
          value = value.map(function (v) { return getFunctionValue(v, animatable); });
          if (value.length === 1) { value = value[0]; }
        }
        t[p] = value;
      }
      t.duration = parseFloat(t.duration);
      t.delay = parseFloat(t.delay);
      return t;
    }

    function normalizeTweens(prop, animatable) {
      var previousTween;
      return prop.tweens.map(function (t) {
        var tween = normalizeTweenValues(t, animatable);
        var tweenValue = tween.value;
        var to = is.arr(tweenValue) ? tweenValue[1] : tweenValue;
        var toUnit = getUnit(to);
        var originalValue = getOriginalTargetValue(animatable.target, prop.name, toUnit, animatable);
        var previousValue = previousTween ? previousTween.to.original : originalValue;
        var from = is.arr(tweenValue) ? tweenValue[0] : previousValue;
        var fromUnit = getUnit(from) || getUnit(originalValue);
        var unit = toUnit || fromUnit;
        if (is.und(to)) { to = previousValue; }
        tween.from = decomposeValue(from, unit);
        tween.to = decomposeValue(getRelativeValue(to, from), unit);
        tween.start = previousTween ? previousTween.end : 0;
        tween.end = tween.start + tween.delay + tween.duration + tween.endDelay;
        tween.easing = parseEasings(tween.easing, tween.duration);
        tween.isPath = is.pth(tweenValue);
        tween.isPathTargetInsideSVG = tween.isPath && is.svg(animatable.target);
        tween.isColor = is.col(tween.from.original);
        if (tween.isColor) { tween.round = 1; }
        previousTween = tween;
        return tween;
      });
    }

    // Tween progress

    var setProgressValue = {
      css: function (t, p, v) { return t.style[p] = v; },
      attribute: function (t, p, v) { return t.setAttribute(p, v); },
      object: function (t, p, v) { return t[p] = v; },
      transform: function (t, p, v, transforms, manual) {
        transforms.list.set(p, v);
        if (p === transforms.last || manual) {
          var str = '';
          transforms.list.forEach(function (value, prop) { str += prop + "(" + value + ") "; });
          t.style.transform = str;
        }
      }
    };

    // Set Value helper

    function setTargetsValue(targets, properties) {
      var animatables = getAnimatables(targets);
      animatables.forEach(function (animatable) {
        for (var property in properties) {
          var value = getFunctionValue(properties[property], animatable);
          var target = animatable.target;
          var valueUnit = getUnit(value);
          var originalValue = getOriginalTargetValue(target, property, valueUnit, animatable);
          var unit = valueUnit || getUnit(originalValue);
          var to = getRelativeValue(validateValue(value, unit), originalValue);
          var animType = getAnimationType(target, property);
          setProgressValue[animType](target, property, to, animatable.transforms, true);
        }
      });
    }

    // Animations

    function createAnimation(animatable, prop) {
      var animType = getAnimationType(animatable.target, prop.name);
      if (animType) {
        var tweens = normalizeTweens(prop, animatable);
        var lastTween = tweens[tweens.length - 1];
        return {
          type: animType,
          property: prop.name,
          animatable: animatable,
          tweens: tweens,
          duration: lastTween.end,
          delay: tweens[0].delay,
          endDelay: lastTween.endDelay
        }
      }
    }

    function getAnimations(animatables, properties) {
      return filterArray(flattenArray(animatables.map(function (animatable) {
        return properties.map(function (prop) {
          return createAnimation(animatable, prop);
        });
      })), function (a) { return !is.und(a); });
    }

    // Create Instance

    function getInstanceTimings(animations, tweenSettings) {
      var animLength = animations.length;
      var getTlOffset = function (anim) { return anim.timelineOffset ? anim.timelineOffset : 0; };
      var timings = {};
      timings.duration = animLength ? Math.max.apply(Math, animations.map(function (anim) { return getTlOffset(anim) + anim.duration; })) : tweenSettings.duration;
      timings.delay = animLength ? Math.min.apply(Math, animations.map(function (anim) { return getTlOffset(anim) + anim.delay; })) : tweenSettings.delay;
      timings.endDelay = animLength ? timings.duration - Math.max.apply(Math, animations.map(function (anim) { return getTlOffset(anim) + anim.duration - anim.endDelay; })) : tweenSettings.endDelay;
      return timings;
    }

    var instanceID = 0;

    function createNewInstance(params) {
      var instanceSettings = replaceObjectProps(defaultInstanceSettings, params);
      var tweenSettings = replaceObjectProps(defaultTweenSettings, params);
      var properties = getProperties(tweenSettings, params);
      var animatables = getAnimatables(params.targets);
      var animations = getAnimations(animatables, properties);
      var timings = getInstanceTimings(animations, tweenSettings);
      var id = instanceID;
      instanceID++;
      return mergeObjects(instanceSettings, {
        id: id,
        children: [],
        animatables: animatables,
        animations: animations,
        duration: timings.duration,
        delay: timings.delay,
        endDelay: timings.endDelay
      });
    }

    // Core

    var activeInstances = [];

    var engine = (function () {
      var raf;

      function play() {
        if (!raf && (!isDocumentHidden() || !anime.suspendWhenDocumentHidden) && activeInstances.length > 0) {
          raf = requestAnimationFrame(step);
        }
      }
      function step(t) {
        // memo on algorithm issue:
        // dangerous iteration over mutable `activeInstances`
        // (that collection may be updated from within callbacks of `tick`-ed animation instances)
        var activeInstancesLength = activeInstances.length;
        var i = 0;
        while (i < activeInstancesLength) {
          var activeInstance = activeInstances[i];
          if (!activeInstance.paused) {
            activeInstance.tick(t);
            i++;
          } else {
            activeInstances.splice(i, 1);
            activeInstancesLength--;
          }
        }
        raf = i > 0 ? requestAnimationFrame(step) : undefined;
      }

      function handleVisibilityChange() {
        if (!anime.suspendWhenDocumentHidden) { return; }

        if (isDocumentHidden()) {
          // suspend ticks
          raf = cancelAnimationFrame(raf);
        } else { // is back to active tab
          // first adjust animations to consider the time that ticks were suspended
          activeInstances.forEach(
            function (instance) { return instance ._onDocumentVisibility(); }
          );
          engine();
        }
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }

      return play;
    })();

    function isDocumentHidden() {
      return !!document && document.hidden;
    }

    // Public Instance

    function anime(params) {
      if ( params === void 0 ) params = {};


      var startTime = 0, lastTime = 0, now = 0;
      var children, childrenLength = 0;
      var resolve = null;

      function makePromise(instance) {
        var promise = window.Promise && new Promise(function (_resolve) { return resolve = _resolve; });
        instance.finished = promise;
        return promise;
      }

      var instance = createNewInstance(params);
      makePromise(instance);

      function toggleInstanceDirection() {
        var direction = instance.direction;
        if (direction !== 'alternate') {
          instance.direction = direction !== 'normal' ? 'normal' : 'reverse';
        }
        instance.reversed = !instance.reversed;
        children.forEach(function (child) { return child.reversed = instance.reversed; });
      }

      function adjustTime(time) {
        return instance.reversed ? instance.duration - time : time;
      }

      function resetTime() {
        startTime = 0;
        lastTime = adjustTime(instance.currentTime) * (1 / anime.speed);
      }

      function seekChild(time, child) {
        if (child) { child.seek(time - child.timelineOffset); }
      }

      function syncInstanceChildren(time) {
        if (!instance.reversePlayback) {
          for (var i = 0; i < childrenLength; i++) { seekChild(time, children[i]); }
        } else {
          for (var i$1 = childrenLength; i$1--;) { seekChild(time, children[i$1]); }
        }
      }

      function setAnimationsProgress(insTime) {
        var i = 0;
        var animations = instance.animations;
        var animationsLength = animations.length;
        while (i < animationsLength) {
          var anim = animations[i];
          var animatable = anim.animatable;
          var tweens = anim.tweens;
          var tweenLength = tweens.length - 1;
          var tween = tweens[tweenLength];
          // Only check for keyframes if there is more than one tween
          if (tweenLength) { tween = filterArray(tweens, function (t) { return (insTime < t.end); })[0] || tween; }
          var elapsed = minMax(insTime - tween.start - tween.delay, 0, tween.duration) / tween.duration;
          var eased = isNaN(elapsed) ? 1 : tween.easing(elapsed);
          var strings = tween.to.strings;
          var round = tween.round;
          var numbers = [];
          var toNumbersLength = tween.to.numbers.length;
          var progress = (void 0);
          for (var n = 0; n < toNumbersLength; n++) {
            var value = (void 0);
            var toNumber = tween.to.numbers[n];
            var fromNumber = tween.from.numbers[n] || 0;
            if (!tween.isPath) {
              value = fromNumber + (eased * (toNumber - fromNumber));
            } else {
              value = getPathProgress(tween.value, eased * toNumber, tween.isPathTargetInsideSVG);
            }
            if (round) {
              if (!(tween.isColor && n > 2)) {
                value = Math.round(value * round) / round;
              }
            }
            numbers.push(value);
          }
          // Manual Array.reduce for better performances
          var stringsLength = strings.length;
          if (!stringsLength) {
            progress = numbers[0];
          } else {
            progress = strings[0];
            for (var s = 0; s < stringsLength; s++) {
              strings[s];
              var b = strings[s + 1];
              var n$1 = numbers[s];
              if (!isNaN(n$1)) {
                if (!b) {
                  progress += n$1 + ' ';
                } else {
                  progress += n$1 + b;
                }
              }
            }
          }
          setProgressValue[anim.type](animatable.target, anim.property, progress, animatable.transforms);
          anim.currentValue = progress;
          i++;
        }
      }

      function setCallback(cb) {
        if (instance[cb] && !instance.passThrough) { instance[cb](instance); }
      }

      function countIteration() {
        if (instance.remaining && instance.remaining !== true) {
          instance.remaining--;
        }
      }

      function setInstanceProgress(engineTime) {
        var insDuration = instance.duration;
        var insDelay = instance.delay;
        var insEndDelay = insDuration - instance.endDelay;
        var insTime = adjustTime(engineTime);
        instance.progress = minMax((insTime / insDuration) * 100, 0, 100);
        instance.reversePlayback = insTime < instance.currentTime;
        if (children) { syncInstanceChildren(insTime); }
        if (!instance.began && instance.currentTime > 0) {
          instance.began = true;
          setCallback('begin');
        }
        if (!instance.loopBegan && instance.currentTime > 0) {
          instance.loopBegan = true;
          setCallback('loopBegin');
        }
        if (insTime <= insDelay && instance.currentTime !== 0) {
          setAnimationsProgress(0);
        }
        if ((insTime >= insEndDelay && instance.currentTime !== insDuration) || !insDuration) {
          setAnimationsProgress(insDuration);
        }
        if (insTime > insDelay && insTime < insEndDelay) {
          if (!instance.changeBegan) {
            instance.changeBegan = true;
            instance.changeCompleted = false;
            setCallback('changeBegin');
          }
          setCallback('change');
          setAnimationsProgress(insTime);
        } else {
          if (instance.changeBegan) {
            instance.changeCompleted = true;
            instance.changeBegan = false;
            setCallback('changeComplete');
          }
        }
        instance.currentTime = minMax(insTime, 0, insDuration);
        if (instance.began) { setCallback('update'); }
        if (engineTime >= insDuration) {
          lastTime = 0;
          countIteration();
          if (!instance.remaining) {
            instance.paused = true;
            if (!instance.completed) {
              instance.completed = true;
              setCallback('loopComplete');
              setCallback('complete');
              if (!instance.passThrough && 'Promise' in window) {
                resolve();
                makePromise(instance);
              }
            }
          } else {
            startTime = now;
            setCallback('loopComplete');
            instance.loopBegan = false;
            if (instance.direction === 'alternate') {
              toggleInstanceDirection();
            }
          }
        }
      }

      instance.reset = function() {
        var direction = instance.direction;
        instance.passThrough = false;
        instance.currentTime = 0;
        instance.progress = 0;
        instance.paused = true;
        instance.began = false;
        instance.loopBegan = false;
        instance.changeBegan = false;
        instance.completed = false;
        instance.changeCompleted = false;
        instance.reversePlayback = false;
        instance.reversed = direction === 'reverse';
        instance.remaining = instance.loop;
        children = instance.children;
        childrenLength = children.length;
        for (var i = childrenLength; i--;) { instance.children[i].reset(); }
        if (instance.reversed && instance.loop !== true || (direction === 'alternate' && instance.loop === 1)) { instance.remaining++; }
        setAnimationsProgress(instance.reversed ? instance.duration : 0);
      };

      // internal method (for engine) to adjust animation timings before restoring engine ticks (rAF)
      instance._onDocumentVisibility = resetTime;

      // Set Value helper

      instance.set = function(targets, properties) {
        setTargetsValue(targets, properties);
        return instance;
      };

      instance.tick = function(t) {
        now = t;
        if (!startTime) { startTime = now; }
        setInstanceProgress((now + (lastTime - startTime)) * anime.speed);
      };

      instance.seek = function(time) {
        setInstanceProgress(adjustTime(time));
      };

      instance.pause = function() {
        instance.paused = true;
        resetTime();
      };

      instance.play = function() {
        if (!instance.paused) { return; }
        if (instance.completed) { instance.reset(); }
        instance.paused = false;
        activeInstances.push(instance);
        resetTime();
        engine();
      };

      instance.reverse = function() {
        toggleInstanceDirection();
        instance.completed = instance.reversed ? false : true;
        resetTime();
      };

      instance.restart = function() {
        instance.reset();
        instance.play();
      };

      instance.remove = function(targets) {
        var targetsArray = parseTargets(targets);
        removeTargetsFromInstance(targetsArray, instance);
      };

      instance.reset();

      if (instance.autoplay) { instance.play(); }

      return instance;

    }

    // Remove targets from animation

    function removeTargetsFromAnimations(targetsArray, animations) {
      for (var a = animations.length; a--;) {
        if (arrayContains(targetsArray, animations[a].animatable.target)) {
          animations.splice(a, 1);
        }
      }
    }

    function removeTargetsFromInstance(targetsArray, instance) {
      var animations = instance.animations;
      var children = instance.children;
      removeTargetsFromAnimations(targetsArray, animations);
      for (var c = children.length; c--;) {
        var child = children[c];
        var childAnimations = child.animations;
        removeTargetsFromAnimations(targetsArray, childAnimations);
        if (!childAnimations.length && !child.children.length) { children.splice(c, 1); }
      }
      if (!animations.length && !children.length) { instance.pause(); }
    }

    function removeTargetsFromActiveInstances(targets) {
      var targetsArray = parseTargets(targets);
      for (var i = activeInstances.length; i--;) {
        var instance = activeInstances[i];
        removeTargetsFromInstance(targetsArray, instance);
      }
    }

    // Stagger helpers

    function stagger(val, params) {
      if ( params === void 0 ) params = {};

      var direction = params.direction || 'normal';
      var easing = params.easing ? parseEasings(params.easing) : null;
      var grid = params.grid;
      var axis = params.axis;
      var fromIndex = params.from || 0;
      var fromFirst = fromIndex === 'first';
      var fromCenter = fromIndex === 'center';
      var fromLast = fromIndex === 'last';
      var isRange = is.arr(val);
      var val1 = isRange ? parseFloat(val[0]) : parseFloat(val);
      var val2 = isRange ? parseFloat(val[1]) : 0;
      var unit = getUnit(isRange ? val[1] : val) || 0;
      var start = params.start || 0 + (isRange ? val1 : 0);
      var values = [];
      var maxValue = 0;
      return function (el, i, t) {
        if (fromFirst) { fromIndex = 0; }
        if (fromCenter) { fromIndex = (t - 1) / 2; }
        if (fromLast) { fromIndex = t - 1; }
        if (!values.length) {
          for (var index = 0; index < t; index++) {
            if (!grid) {
              values.push(Math.abs(fromIndex - index));
            } else {
              var fromX = !fromCenter ? fromIndex%grid[0] : (grid[0]-1)/2;
              var fromY = !fromCenter ? Math.floor(fromIndex/grid[0]) : (grid[1]-1)/2;
              var toX = index%grid[0];
              var toY = Math.floor(index/grid[0]);
              var distanceX = fromX - toX;
              var distanceY = fromY - toY;
              var value = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
              if (axis === 'x') { value = -distanceX; }
              if (axis === 'y') { value = -distanceY; }
              values.push(value);
            }
            maxValue = Math.max.apply(Math, values);
          }
          if (easing) { values = values.map(function (val) { return easing(val / maxValue) * maxValue; }); }
          if (direction === 'reverse') { values = values.map(function (val) { return axis ? (val < 0) ? val * -1 : -val : Math.abs(maxValue - val); }); }
        }
        var spacing = isRange ? (val2 - val1) / maxValue : val1;
        return start + (spacing * (Math.round(values[i] * 100) / 100)) + unit;
      }
    }

    // Timeline

    function timeline(params) {
      if ( params === void 0 ) params = {};

      var tl = anime(params);
      tl.duration = 0;
      tl.add = function(instanceParams, timelineOffset) {
        var tlIndex = activeInstances.indexOf(tl);
        var children = tl.children;
        if (tlIndex > -1) { activeInstances.splice(tlIndex, 1); }
        function passThrough(ins) { ins.passThrough = true; }
        for (var i = 0; i < children.length; i++) { passThrough(children[i]); }
        var insParams = mergeObjects(instanceParams, replaceObjectProps(defaultTweenSettings, params));
        insParams.targets = insParams.targets || params.targets;
        var tlDuration = tl.duration;
        insParams.autoplay = false;
        insParams.direction = tl.direction;
        insParams.timelineOffset = is.und(timelineOffset) ? tlDuration : getRelativeValue(timelineOffset, tlDuration);
        passThrough(tl);
        tl.seek(insParams.timelineOffset);
        var ins = anime(insParams);
        passThrough(ins);
        children.push(ins);
        var timings = getInstanceTimings(children, params);
        tl.delay = timings.delay;
        tl.endDelay = timings.endDelay;
        tl.duration = timings.duration;
        tl.seek(0);
        tl.reset();
        if (tl.autoplay) { tl.play(); }
        return tl;
      };
      return tl;
    }

    anime.version = '3.2.1';
    anime.speed = 1;
    // TODO:#review: naming, documentation
    anime.suspendWhenDocumentHidden = true;
    anime.running = activeInstances;
    anime.remove = removeTargetsFromActiveInstances;
    anime.get = getOriginalTargetValue;
    anime.set = setTargetsValue;
    anime.convertPx = convertPxToUnit;
    anime.path = getPath;
    anime.setDashoffset = setDashoffset;
    anime.stagger = stagger;
    anime.timeline = timeline;
    anime.easing = parseEasings;
    anime.penner = penner;
    anime.random = function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };

    /* src\core\Congrats.svelte generated by Svelte v3.38.3 */
    const file$f = "src\\core\\Congrats.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	child_ctx[8] = list;
    	child_ctx[9] = i;
    	return child_ctx;
    }

    // (61:4) {#each stars as star}
    function create_each_block$2(ctx) {
    	let div;
    	let svg;
    	let polygon;
    	let polygon_fill_value;
    	let polygon_stroke_value;
    	let t;
    	let each_value = /*each_value*/ ctx[8];
    	let star_index = /*star_index*/ ctx[9];
    	const assign_div = () => /*div_binding*/ ctx[5](div, each_value, star_index);
    	const unassign_div = () => /*div_binding*/ ctx[5](null, each_value, star_index);

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			polygon = svg_element("polygon");
    			t = space();
    			attr_dev(polygon, "fill", polygon_fill_value = /*star*/ ctx[7].color);
    			attr_dev(polygon, "stroke", polygon_stroke_value = /*star*/ ctx[7].color);
    			attr_dev(polygon, "stroke-width", "37.6152");
    			attr_dev(polygon, "stroke-linecap", "round");
    			attr_dev(polygon, "stroke-linejoin", "round");
    			attr_dev(polygon, "stroke-miterlimit", "10");
    			attr_dev(polygon, "points", "259.216,29.942 330.27,173.919 489.16,197.007 374.185,309.08 \r\n                            401.33,467.31 259.216,392.612 117.104,467.31 144.25,309.08 \r\n                            29.274,197.007 188.165,173.919");
    			add_location(polygon, file$f, 71, 16, 1915);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			add_location(svg, file$f, 69, 12, 1817);
    			attr_dev(div, "class", "box svelte-1nasn8");
    			set_style(div, "--size", /*config*/ ctx[2].size + "px");
    			set_style(div, "--left", /*config*/ ctx[2].pos[0] + "px");
    			set_style(div, "--top", /*config*/ ctx[2].pos[1] + "px");
    			add_location(div, file$f, 61, 8, 1577);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, polygon);
    			append_dev(div, t);
    			assign_div();
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*stars*/ 1 && polygon_fill_value !== (polygon_fill_value = /*star*/ ctx[7].color)) {
    				attr_dev(polygon, "fill", polygon_fill_value);
    			}

    			if (dirty & /*stars*/ 1 && polygon_stroke_value !== (polygon_stroke_value = /*star*/ ctx[7].color)) {
    				attr_dev(polygon, "stroke", polygon_stroke_value);
    			}

    			if (each_value !== /*each_value*/ ctx[8] || star_index !== /*star_index*/ ctx[9]) {
    				unassign_div();
    				each_value = /*each_value*/ ctx[8];
    				star_index = /*star_index*/ ctx[9];
    				assign_div();
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			unassign_div();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(61:4) {#each stars as star}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$i(ctx) {
    	let div;
    	let each_value = /*stars*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "svelte-1nasn8");
    			toggle_class(div, "hidden", /*hidden*/ ctx[1]);
    			add_location(div, file$f, 59, 0, 1522);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*config, stars*/ 5) {
    				each_value = /*stars*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*hidden*/ 2) {
    				toggle_class(div, "hidden", /*hidden*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Congrats", slots, []);

    	let config = {
    		size: 25,
    		pos: [100, 120],
    		xSeed: [20, 100],
    		ySeed: [20, 120],
    		duration: 1500
    	};

    	let stars;
    	let hidden = true;

    	function reset() {
    		anime({
    			targets: stars.map(star => star.box),
    			translateX: 0,
    			translateY: 0,
    			rotate: 0,
    			opacity: 1,
    			duration: 0
    		});
    	}

    	function play() {
    		let delay = () => rand(150, 300);
    		let translateX = () => randFrom([1, -1]) * (config.xSeed[0] + rand(0, config.xSeed[1]));
    		let translateY = () => randFrom([1, -1]) * (config.ySeed[0] + rand(0, config.ySeed[1]));
    		let rotate = () => rand(200, 360);
    		let scale = () => 1 + rand(1, 10) / 10;
    		reset();
    		$$invalidate(1, hidden = false);

    		anime({
    			targets: stars.map(star => star.box),
    			translateX,
    			translateY,
    			rotate,
    			scale,
    			delay,
    			opacity: {
    				value: 0,
    				easing: "linear",
    				delay: config.duration - 200,
    				duration: 500
    			},
    			easing: "easeOutElastic",
    			duration: config.duration,
    			complete: () => $$invalidate(1, hidden = true)
    		});
    	}

    	let { noOfStars = 150 } = $$props;

    	stars = range(0, noOfStars).map(() => {
    		return {
    			box: undefined,
    			color: randFrom(["yellow", "orange", "red"])
    		};
    	});

    	onMount(reset);
    	const writable_props = ["noOfStars"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Congrats> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value, each_value, star_index) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			each_value[star_index].box = $$value;
    			$$invalidate(0, stars);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("noOfStars" in $$props) $$invalidate(4, noOfStars = $$props.noOfStars);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		rand,
    		randFrom,
    		range,
    		anime,
    		config,
    		stars,
    		hidden,
    		reset,
    		play,
    		noOfStars
    	});

    	$$self.$inject_state = $$props => {
    		if ("config" in $$props) $$invalidate(2, config = $$props.config);
    		if ("stars" in $$props) $$invalidate(0, stars = $$props.stars);
    		if ("hidden" in $$props) $$invalidate(1, hidden = $$props.hidden);
    		if ("noOfStars" in $$props) $$invalidate(4, noOfStars = $$props.noOfStars);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [stars, hidden, config, play, noOfStars, div_binding];
    }

    class Congrats extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, { play: 3, noOfStars: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Congrats",
    			options,
    			id: create_fragment$i.name
    		});
    	}

    	get play() {
    		return this.$$.ctx[3];
    	}

    	set play(value) {
    		throw new Error("<Congrats>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get noOfStars() {
    		throw new Error("<Congrats>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set noOfStars(value) {
    		throw new Error("<Congrats>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\core\IoBus.svelte generated by Svelte v3.38.3 */

    let callbacks = {};

    function onAny(name, cb) {
    	var _a;

    	let funcs = (_a = callbacks[name]) !== null && _a !== void 0
    	? _a
    	: [];

    	funcs.push(cb);
    	callbacks[name] = funcs;
    }

    function fireAny(name, args) {
    	var _a;

    	let funcs = (_a = callbacks[name]) !== null && _a !== void 0
    	? _a
    	: [];

    	funcs.forEach(func => setTimeout(() => func(args), 0));
    }

    /* src\core\TimedCmd.svelte generated by Svelte v3.38.3 */

    class CTimedCmd {
    	constructor(cmd, timeout, jitter) {
    		this._cmd = cmd;
    		this._timeout = timeout;
    		this._jitter = jitter !== null && jitter !== void 0 ? jitter : 0;
    	}

    	set() {
    		let timeout = rand(this._timeout - this._jitter, this._timeout + this._jitter);
    		this._timeoutId = setTimeout(() => fireAny(this._cmd, {}), timeout);
    	}

    	cancel() {
    		clearTimeout(this._timeoutId);
    	}

    	reset() {
    		this.cancel();
    		this.set();
    	}
    }

    /* src\plus-over\Model.svelte generated by Svelte v3.38.3 */



    function on$2(name, cb) {
    	onAny(name, cb);
    }

    function fire$2(name, args) {
    	fireAny(name, args);
    }

    function newTimedCmd$1(cmd, timeout, jitter) {
    	return new CTimedCmd(cmd, timeout, jitter !== null && jitter !== void 0 ? jitter : 0);
    }

    /* src\plus-over\PlusOver.svelte generated by Svelte v3.38.3 */


    let _game$1;
    let _tcNewRound = newTimedCmd$1("--cmd-new-round", 1000);
    let _tcIdle = newTimedCmd$1("--cmd-idle", 10000, 3000);
    let _card = Anki.getCard();
    let _playbook = [];
    let _roundNo = -1;

    function getPair() {
    	let nums = _card.content.split(",");
    	let pairs = [];

    	for (let i = 0; i < nums.length - 1; i += 2) {
    		pairs.push([parseInt(nums[i]), parseInt(nums[i + 1])]);
    	}

    	let pair = randFrom(pairs);
    	return pair;
    }

    function* contentAsNums() {
    	for (let line of splitNoEmpty(_card.content, "\n")) {
    		for (let seg of splitNoEmpty(line, ",")) {
    			for (let num of splitNoEmpty(seg)) {
    				yield parseInt(num);
    			}
    		}
    	}
    }

    function splitToLines(numsInLine) {
    	let lines = [];
    	let line = [];

    	for (let num of contentAsNums()) {
    		line.push(num);

    		if (line.length == numsInLine) {
    			lines.push(line);
    			line = [];
    		}
    	}

    	return lines;
    }

    function getLine() {
    	return randFrom(splitToLines(4));
    }

    function addPlusRound() {
    	let pair = getPair();
    	let sumDigit = (pair[0] + pair[1]) % 10;
    	let op = "+";
    	let a0 = pair[0];
    	let a1 = rand(1, 8);
    	let a = 10 * a1 + a0;
    	let b0 = pair[1];
    	let b1 = rand(1, 9 - a1);
    	let b = 10 * b1 + b0;
    	let ans = a + b;
    	let nums = shuffle([a, b]);
    	let answers = shuffle([ans, ans + randSign() * rand(1, 9), ans > 50 ? ans - 10 : ans + 10]);
    	let rightAt = answers.findIndex(x => x == ans);

    	_playbook.push({
    		pair,
    		nums,
    		op,
    		sumDigit,
    		answers,
    		rightAt
    	});
    }

    function addMinusRound() {
    	let pair = getPair();
    	let sumDigit = (pair[0] + pair[1]) % 10;
    	let op = "-";
    	let a0 = pair[0];
    	let a1 = rand(1, 9);
    	let a = 10 * a1 + a0;
    	let b1 = rand(1, 9 - a1);
    	let b0 = pair[1];
    	let b = 10 * b1 + b0;
    	let sum = a + b;
    	let nums = [sum, trueFalse() ? a : b];
    	let ans = sum - nums[1];
    	let answers = shuffle([ans, ans + rand(1, 9) * randSign(), ans > 50 ? ans - 10 : ans + 10]);
    	let rightAt = answers.findIndex(x => x == ans);

    	_playbook.push({
    		pair,
    		nums,
    		op,
    		sumDigit,
    		answers,
    		rightAt
    	});
    }

    function addMulRound() {
    	let line = getLine();
    	let a = rand(line[0], line[1]);
    	let b = rand(line[2], line[3]);
    	let pair = [a % 10, b % 10];
    	let nums = shuffle([a, b]);
    	let op = "x";
    	let ans = a * b;
    	let sumDigit = ans % 10;
    	let answers = shuffle([ans, ans + randSign() * Math.min(...nums), ans > 50 ? ans - 10 : ans + 10]);
    	let rightAt = answers.findIndex(x => x == ans);

    	_playbook.push({
    		pair,
    		nums,
    		op,
    		sumDigit,
    		answers,
    		rightAt
    	});
    }

    function addDivRound() {
    	let line = getLine();
    	let a = rand(line[0], line[1]);
    	let b = rand(line[2], line[3]);
    	let prod = a * b;
    	let pair = [a % 10, b % 10];
    	let nums = [prod, randFrom([a, b])];
    	let op = "/";
    	let ans = prod / nums[1];
    	let sumDigit = a * b % 10;
    	let answers = shuffle([ans, ans > 2 ? ans + randSign() : ans + 1, ans > 50 ? ans - 10 : ans + 10]);
    	let rightAt = answers.findIndex(x => x == ans);

    	_playbook.push({
    		pair,
    		nums,
    		op,
    		sumDigit,
    		answers,
    		rightAt
    	});
    }

    function addNextRounds() {
    	let config = Anki.getConfig();

    	switch (config.game.toLocaleLowerCase()) {
    		case "plus-over":
    			addPlusRound();
    			addMinusRound();
    			break;
    		case "mul-div":
    			addMulRound();
    			addDivRound();
    			break;
    	}
    }

    function fillRoundsAtStart() {
    	var _a;
    	let config = Anki.getConfig();
    	let noOfRounds = (_a = config.rounds) !== null && _a !== void 0 ? _a : 4;

    	for (let cnt = noOfRounds; cnt-- > 0; ) {
    		addNextRounds();
    	}
    }

    class CPlusOver {
    	newRound() {
    		var _a;
    		let config = Anki.getConfig();
    		_tcIdle.reset();
    		_tcNewRound.cancel();
    		_roundNo++;
    		if (_roundNo >= _playbook.length) error(`Round index out of bound: ${_roundNo} length=${_playbook.length}`);
    		let round = _playbook[_roundNo];
    		let count = _playbook.length - _roundNo;

    		let showHint = (_a = config.showHint) !== null && _a !== void 0
    		? _a
    		: true;

    		_game$1 = Object.assign(
    			{
    				roundsLeft: count,
    				clickedAt: 0,
    				state: "first-click",
    				showHint
    			},
    			round
    		);

    		fire$2("--cmd-update-views", _game$1);
    	}

    	gotClicked() {
    		switch (_game$1.state) {
    			case "first-click":
    				fire$2("--evt-answer");
    				break;
    			case "answered":
    				fire$2("--cmd-new-round");
    				break;
    		}
    	}

    	yesNo() {
    		if (_game$1.state !== "answered") return;
    		if (_game$1.roundsLeft <= 0) return;
    		let correct = _game$1.clickedAt === _game$1.rightAt;
    		fire$2(correct ? "--evt-yes" : "--evt-no");
    	}

    	gotAnswer(args) {
    		_tcIdle.reset();

    		switch (_game$1.state) {
    			case "first-click":
    				_game$1.state = "active";
    				break;
    			case "active":
    				_game$1.clickedAt = args.index;
    				_game$1.state = "answered";
    				this.yesNo();
    				break;
    			case "answered":
    				fire$2("--cmd-new-round");
    				return;
    		}

    		fire$2("--cmd-update-views", _game$1);
    	}

    	yes() {
    		if (_game$1.roundsLeft === 1) {
    			fire$2("--evt-done");
    		} else {
    			Mp3.play("yes");
    		}

    		_tcNewRound.reset();
    	}

    	no() {
    		Mp3.play("no");
    		addNextRounds();
    	}

    	done() {
    		Mp3.play("done");
    		Anki.showAnswer();
    		addNextRounds();
    	}

    	idle() {
    		_tcIdle.reset();
    		Mp3.play("idle");
    	}
    }

    const PlusOver = new CPlusOver();
    fillRoundsAtStart();

    /* src\plus-over\Count.svelte generated by Svelte v3.38.3 */
    const file$e = "src\\plus-over\\Count.svelte";

    function create_fragment$h(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_count*/ ctx[2]);
    			attr_dev(button, "class", /*_bgColor*/ ctx[3]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*sz*/ ctx[1]);
    			add_location(button, file$e, 14, 0, 369);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = action_destroyer(pulse.call(null, button));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_count*/ 4) set_data_dev(t, /*_count*/ ctx[2]);

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 2) {
    				set_style(button, "font-size", /*sz*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Count", slots, []);
    	
    	let _count;
    	let { ga } = $$props;
    	let { sz = "30px" } = $$props;

    	function updateView(game) {
    		$$invalidate(2, _count = game.roundsLeft.toString());
    	}

    	on$2("--cmd-update-views", updateView);
    	let _bgColor = getBgColor(ga);
    	const writable_props = ["ga", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Count> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		getBgColor,
    		on: on$2,
    		_count,
    		ga,
    		sz,
    		updateView,
    		_bgColor
    	});

    	$$self.$inject_state = $$props => {
    		if ("_count" in $$props) $$invalidate(2, _count = $$props._count);
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    		if ("_bgColor" in $$props) $$invalidate(3, _bgColor = $$props._bgColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, sz, _count, _bgColor];
    }

    class Count$2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, { ga: 0, sz: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Count",
    			options,
    			id: create_fragment$h.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Count> was created without expected prop 'ga'");
    		}
    	}

    	get ga() {
    		throw new Error("<Count>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Count>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Count>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Count>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\plus-over\Num.svelte generated by Svelte v3.38.3 */
    const file$d = "src\\plus-over\\Num.svelte";

    function create_fragment$g(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_num*/ ctx[2]);
    			attr_dev(button, "class", /*_bgColor*/ ctx[3]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*sz*/ ctx[1]);
    			add_location(button, file$d, 18, 0, 443);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*onClick*/ ctx[4], false, false, false),
    					action_destroyer(pulse.call(null, button))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_num*/ 4) set_data_dev(t, /*_num*/ ctx[2]);

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 2) {
    				set_style(button, "font-size", /*sz*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Num", slots, []);
    	
    	let { ga } = $$props;
    	let { index } = $$props;
    	let { sz = "30px" } = $$props;
    	let _num;
    	let _bgColor = getBgColor(ga);

    	function onClick() {
    		fire$2("--evt-click");
    	}

    	function updateView(game) {
    		$$invalidate(2, _num = game.nums[index].toString());
    	}

    	on$2("--cmd-update-views", updateView);
    	const writable_props = ["ga", "index", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Num> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("index" in $$props) $$invalidate(5, index = $$props.index);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		getBgColor,
    		on: on$2,
    		fire: fire$2,
    		ga,
    		index,
    		sz,
    		_num,
    		_bgColor,
    		onClick,
    		updateView
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("index" in $$props) $$invalidate(5, index = $$props.index);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    		if ("_num" in $$props) $$invalidate(2, _num = $$props._num);
    		if ("_bgColor" in $$props) $$invalidate(3, _bgColor = $$props._bgColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, sz, _num, _bgColor, onClick, index];
    }

    class Num$2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, { ga: 0, index: 5, sz: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Num",
    			options,
    			id: create_fragment$g.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Num> was created without expected prop 'ga'");
    		}

    		if (/*index*/ ctx[5] === undefined && !("index" in props)) {
    			console.warn("<Num> was created without expected prop 'index'");
    		}
    	}

    	get ga() {
    		throw new Error("<Num>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Num>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get index() {
    		throw new Error("<Num>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set index(value) {
    		throw new Error("<Num>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Num>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Num>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\plus-over\Op.svelte generated by Svelte v3.38.3 */
    const file$c = "src\\plus-over\\Op.svelte";

    function create_fragment$f(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_op*/ ctx[2]);
    			attr_dev(button, "class", /*_bgColor*/ ctx[3]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*sz*/ ctx[1]);
    			add_location(button, file$c, 15, 0, 395);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false),
    					action_destroyer(pulse.call(null, button))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_op*/ 4) set_data_dev(t, /*_op*/ ctx[2]);

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 2) {
    				set_style(button, "font-size", /*sz*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Op", slots, []);
    	
    	let { ga } = $$props;
    	let { sz = "30px" } = $$props;
    	let _op = "+";
    	let _bgColor = getBgColor(ga);

    	function updateView(game) {
    		$$invalidate(2, _op = game.op);
    	}

    	on$2("--cmd-update-views", updateView);
    	const writable_props = ["ga", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Op> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => Mp3.playRandom();

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		Mp3,
    		getBgColor,
    		on: on$2,
    		ga,
    		sz,
    		_op,
    		_bgColor,
    		updateView
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    		if ("_op" in $$props) $$invalidate(2, _op = $$props._op);
    		if ("_bgColor" in $$props) $$invalidate(3, _bgColor = $$props._bgColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, sz, _op, _bgColor, click_handler];
    }

    class Op$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, { ga: 0, sz: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Op",
    			options,
    			id: create_fragment$f.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Op> was created without expected prop 'ga'");
    		}
    	}

    	get ga() {
    		throw new Error("<Op>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Op>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Op>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Op>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\plus-over\Ans.svelte generated by Svelte v3.38.3 */
    const file$b = "src\\plus-over\\Ans.svelte";

    function create_fragment$e(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_text*/ ctx[2]);
    			attr_dev(button, "class", /*_class*/ ctx[3]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*sz*/ ctx[1]);
    			add_location(button, file$b, 34, 0, 861);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*onClick*/ ctx[4], false, false, false),
    					action_destroyer(pulse.call(null, button))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_text*/ 4) set_data_dev(t, /*_text*/ ctx[2]);

    			if (dirty & /*_class*/ 8) {
    				attr_dev(button, "class", /*_class*/ ctx[3]);
    			}

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 2) {
    				set_style(button, "font-size", /*sz*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Ans", slots, []);
    	
    	let _text;
    	let _class;
    	let { ga } = $$props;
    	let { index } = $$props;
    	let { sz = "30px" } = $$props;

    	function onClick() {
    		fire$2("--evt-answer", { index });
    	}

    	function getText(game) {
    		if (game.state === "first-click") return "??";
    		return game.answers[index].toString();
    	}

    	function getClass(game) {
    		if (game.state === "first-click") return "bg-gray-100";
    		if (game.state === "active") return "bg-orange-200";
    		if (game.rightAt === index) return "bg-green-200";
    		if (game.clickedAt !== index) return "bg-gray-100";
    		return "bg-red-200";
    	}

    	function updateView(game) {
    		$$invalidate(2, _text = getText(game));
    		$$invalidate(3, _class = getClass(game));
    	}

    	on$2("--cmd-update-views", updateView);
    	const writable_props = ["ga", "index", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Ans> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("index" in $$props) $$invalidate(5, index = $$props.index);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		on: on$2,
    		fire: fire$2,
    		_text,
    		_class,
    		ga,
    		index,
    		sz,
    		onClick,
    		getText,
    		getClass,
    		updateView
    	});

    	$$self.$inject_state = $$props => {
    		if ("_text" in $$props) $$invalidate(2, _text = $$props._text);
    		if ("_class" in $$props) $$invalidate(3, _class = $$props._class);
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("index" in $$props) $$invalidate(5, index = $$props.index);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, sz, _text, _class, onClick, index];
    }

    class Ans$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { ga: 0, index: 5, sz: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ans",
    			options,
    			id: create_fragment$e.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Ans> was created without expected prop 'ga'");
    		}

    		if (/*index*/ ctx[5] === undefined && !("index" in props)) {
    			console.warn("<Ans> was created without expected prop 'index'");
    		}
    	}

    	get ga() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get index() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set index(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\plus-over\Pair.svelte generated by Svelte v3.38.3 */
    const file$a = "src\\plus-over\\Pair.svelte";

    function create_fragment$d(ctx) {
    	let div;
    	let button0;
    	let t0;
    	let t1;
    	let button1;
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			t0 = text(/*p1*/ ctx[2]);
    			t1 = space();
    			button1 = element("button");
    			t2 = text(/*p2*/ ctx[3]);
    			attr_dev(button0, "class", /*_bgColor*/ ctx[4]);
    			add_location(button0, file$a, 17, 4, 507);
    			attr_dev(button1, "class", /*_bgColor*/ ctx[4]);
    			add_location(button1, file$a, 23, 4, 600);
    			set_style(div, "grid-area", /*ga*/ ctx[0]);
    			set_style(div, "font-size", /*sz*/ ctx[1]);
    			add_location(div, file$a, 16, 0, 458);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(button0, t0);
    			append_dev(div, t1);
    			append_dev(div, button1);
    			append_dev(button1, t2);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(pulse.call(null, button0)),
    					action_destroyer(pulse.call(null, button1))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*p1*/ 4) set_data_dev(t0, /*p1*/ ctx[2]);
    			if (dirty & /*p2*/ 8) set_data_dev(t2, /*p2*/ ctx[3]);

    			if (dirty & /*ga*/ 1) {
    				set_style(div, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 2) {
    				set_style(div, "font-size", /*sz*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Pair", slots, []);
    	
    	let { ga } = $$props;
    	let { sz = "15px" } = $$props;
    	let _bgColor = getBgColor(ga);
    	let p1 = "?";
    	let p2 = "?";

    	function updateView(game) {
    		$$invalidate(2, p1 = game.showHint ? game.pair[0].toString() : "?");
    		$$invalidate(3, p2 = game.showHint ? game.pair[1].toString() : "?");
    	}

    	on$2("--cmd-update-views", updateView);
    	const writable_props = ["ga", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Pair> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		getBgColor,
    		on: on$2,
    		ga,
    		sz,
    		_bgColor,
    		p1,
    		p2,
    		updateView
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    		if ("_bgColor" in $$props) $$invalidate(4, _bgColor = $$props._bgColor);
    		if ("p1" in $$props) $$invalidate(2, p1 = $$props.p1);
    		if ("p2" in $$props) $$invalidate(3, p2 = $$props.p2);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, sz, p1, p2, _bgColor];
    }

    class Pair extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { ga: 0, sz: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Pair",
    			options,
    			id: create_fragment$d.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Pair> was created without expected prop 'ga'");
    		}
    	}

    	get ga() {
    		throw new Error("<Pair>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Pair>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Pair>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Pair>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\plus-over\Digit.svelte generated by Svelte v3.38.3 */
    const file$9 = "src\\plus-over\\Digit.svelte";

    function create_fragment$c(ctx) {
    	let div;
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			t = text(/*_digit*/ ctx[2]);
    			attr_dev(button, "class", /*_bgColor*/ ctx[3]);
    			add_location(button, file$9, 16, 4, 447);
    			set_style(div, "grid-area", /*ga*/ ctx[0]);
    			set_style(div, "font-size", /*sz*/ ctx[1]);
    			add_location(div, file$9, 15, 0, 398);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = action_destroyer(pulse.call(null, button));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_digit*/ 4) set_data_dev(t, /*_digit*/ ctx[2]);

    			if (dirty & /*ga*/ 1) {
    				set_style(div, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 2) {
    				set_style(div, "font-size", /*sz*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Digit", slots, []);
    	
    	let { ga } = $$props;
    	let { sz = "15px" } = $$props;
    	let _digit;
    	let _bgColor = getBgColor(ga);

    	function updateView(game) {
    		$$invalidate(2, _digit = game.showHint ? game.sumDigit.toString() : "?");
    	}

    	on$2("--cmd-update-views", updateView);
    	const writable_props = ["ga", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Digit> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		getBgColor,
    		on: on$2,
    		ga,
    		sz,
    		_digit,
    		_bgColor,
    		updateView
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    		if ("_digit" in $$props) $$invalidate(2, _digit = $$props._digit);
    		if ("_bgColor" in $$props) $$invalidate(3, _bgColor = $$props._bgColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, sz, _digit, _bgColor];
    }

    class Digit extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { ga: 0, sz: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Digit",
    			options,
    			id: create_fragment$c.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Digit> was created without expected prop 'ga'");
    		}
    	}

    	get ga() {
    		throw new Error("<Digit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Digit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Digit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Digit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\plus-over\Main.svelte generated by Svelte v3.38.3 */

    // (45:0) <Grid {layout}      on:click={() => fire("--evt-click")}  >
    function create_default_slot$3(ctx) {
    	let count;
    	let t0;
    	let pair;
    	let t1;
    	let digit;
    	let t2;
    	let clock;
    	let t3;
    	let num0;
    	let t4;
    	let op;
    	let t5;
    	let num1;
    	let t6;
    	let ans0;
    	let t7;
    	let ans1;
    	let t8;
    	let ans2;
    	let t9;
    	let congrats_1;
    	let current;
    	count = new Count$2({ props: { ga: "cnt" }, $$inline: true });
    	pair = new Pair({ props: { ga: "p1" }, $$inline: true });
    	digit = new Digit({ props: { ga: "p2" }, $$inline: true });
    	clock = new Clock({ props: { ga: "clk" }, $$inline: true });

    	num0 = new Num$2({
    			props: { ga: "lhs", index: 0 },
    			$$inline: true
    		});

    	op = new Op$1({ props: { ga: "op" }, $$inline: true });

    	num1 = new Num$2({
    			props: { ga: "rhs", index: 1 },
    			$$inline: true
    		});

    	ans0 = new Ans$1({
    			props: { ga: "a1", index: 0 },
    			$$inline: true
    		});

    	ans1 = new Ans$1({
    			props: { ga: "a2", index: 1 },
    			$$inline: true
    		});

    	ans2 = new Ans$1({
    			props: { ga: "a3", index: 2 },
    			$$inline: true
    		});

    	let congrats_1_props = {};
    	congrats_1 = new Congrats({ props: congrats_1_props, $$inline: true });
    	/*congrats_1_binding*/ ctx[2](congrats_1);

    	const block = {
    		c: function create() {
    			create_component(count.$$.fragment);
    			t0 = space();
    			create_component(pair.$$.fragment);
    			t1 = space();
    			create_component(digit.$$.fragment);
    			t2 = space();
    			create_component(clock.$$.fragment);
    			t3 = space();
    			create_component(num0.$$.fragment);
    			t4 = space();
    			create_component(op.$$.fragment);
    			t5 = space();
    			create_component(num1.$$.fragment);
    			t6 = space();
    			create_component(ans0.$$.fragment);
    			t7 = space();
    			create_component(ans1.$$.fragment);
    			t8 = space();
    			create_component(ans2.$$.fragment);
    			t9 = space();
    			create_component(congrats_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(count, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(pair, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(digit, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(clock, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(num0, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(op, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(num1, target, anchor);
    			insert_dev(target, t6, anchor);
    			mount_component(ans0, target, anchor);
    			insert_dev(target, t7, anchor);
    			mount_component(ans1, target, anchor);
    			insert_dev(target, t8, anchor);
    			mount_component(ans2, target, anchor);
    			insert_dev(target, t9, anchor);
    			mount_component(congrats_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const congrats_1_changes = {};
    			congrats_1.$set(congrats_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(count.$$.fragment, local);
    			transition_in(pair.$$.fragment, local);
    			transition_in(digit.$$.fragment, local);
    			transition_in(clock.$$.fragment, local);
    			transition_in(num0.$$.fragment, local);
    			transition_in(op.$$.fragment, local);
    			transition_in(num1.$$.fragment, local);
    			transition_in(ans0.$$.fragment, local);
    			transition_in(ans1.$$.fragment, local);
    			transition_in(ans2.$$.fragment, local);
    			transition_in(congrats_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(count.$$.fragment, local);
    			transition_out(pair.$$.fragment, local);
    			transition_out(digit.$$.fragment, local);
    			transition_out(clock.$$.fragment, local);
    			transition_out(num0.$$.fragment, local);
    			transition_out(op.$$.fragment, local);
    			transition_out(num1.$$.fragment, local);
    			transition_out(ans0.$$.fragment, local);
    			transition_out(ans1.$$.fragment, local);
    			transition_out(ans2.$$.fragment, local);
    			transition_out(congrats_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(count, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(pair, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(digit, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(clock, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(num0, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(op, detaching);
    			if (detaching) detach_dev(t5);
    			destroy_component(num1, detaching);
    			if (detaching) detach_dev(t6);
    			destroy_component(ans0, detaching);
    			if (detaching) detach_dev(t7);
    			destroy_component(ans1, detaching);
    			if (detaching) detach_dev(t8);
    			destroy_component(ans2, detaching);
    			if (detaching) detach_dev(t9);
    			/*congrats_1_binding*/ ctx[2](null);
    			destroy_component(congrats_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(45:0) <Grid {layout}      on:click={() => fire(\\\"--evt-click\\\")}  >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let grid;
    	let current;

    	grid = new Grid({
    			props: {
    				layout: /*layout*/ ctx[1],
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	grid.$on("click", /*click_handler*/ ctx[3]);

    	const block = {
    		c: function create() {
    			create_component(grid.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(grid, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const grid_changes = {};

    			if (dirty & /*$$scope, congrats*/ 33) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(grid, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Main", slots, []);
    	let congrats;

    	function done() {
    		congrats.play();
    		PlusOver.done();
    	}

    	on$2("--cmd-new-round", () => PlusOver.newRound());
    	on$2("--evt-answer", args => PlusOver.gotAnswer(args));
    	on$2("--evt-click", () => PlusOver.gotClicked());
    	on$2("--evt-done", () => done());
    	on$2("--evt-yes", () => PlusOver.yes());
    	on$2("--evt-no", () => PlusOver.no());
    	on$2("--cmd-idle", () => PlusOver.idle());
    	fire$2("--cmd-new-round");

    	let layout = {
    		areas: `
            "cnt   p1   clk "
            "cnt   p2   clk "
            "lhs   op   rhs "
            "a1    a2   a3  "
        `,
    		cols: `1fr 1fr 1fr`,
    		rows: `30px 30px 100px 100px`,
    		bgColors: {
    			cnt: "bg-purple-300",
    			p1: "bg-yellow-100",
    			p2: "bg-pink-100",
    			lhs: "bg-green-100",
    			op: "bg-yellow-200",
    			rhs: "bg-green-100"
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Main> was created with unknown prop '${key}'`);
    	});

    	function congrats_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			congrats = $$value;
    			$$invalidate(0, congrats);
    		});
    	}

    	const click_handler = () => fire$2("--evt-click");

    	$$self.$capture_state = () => ({
    		Grid,
    		Clock,
    		Congrats,
    		self: PlusOver,
    		on: on$2,
    		fire: fire$2,
    		Count: Count$2,
    		Num: Num$2,
    		Op: Op$1,
    		Ans: Ans$1,
    		Pair,
    		Digit,
    		congrats,
    		done,
    		layout
    	});

    	$$self.$inject_state = $$props => {
    		if ("congrats" in $$props) $$invalidate(0, congrats = $$props.congrats);
    		if ("layout" in $$props) $$invalidate(1, layout = $$props.layout);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [congrats, layout, congrats_1_binding, click_handler];
    }

    class Main$2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Main",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src\gcd-lcm\Model.svelte generated by Svelte v3.38.3 */



    function on$1(name, cb) {
    	onAny(name, cb);
    }

    function fire$1(name, args) {
    	fireAny(name, args);
    }

    /* src\gcd-lcm\GcdLcm.svelte generated by Svelte v3.38.3 */


    let _game;

    class CGcdLcm {
    	get game() {
    		return _game;
    	}

    	newRound() {
    		_game = {
    			roundsLeft: 2,
    			nums: [4, 5],
    			divisors: [
    				{ factor: 2, mxPow: 3 },
    				{ factor: 3, mxPow: 3 },
    				{ factor: 5, mxPow: 2 },
    				{ factor: 7, mxPow: 1 }
    			]
    		};

    		fire$1("--cmd-set-models", _game);
    	}

    	go() {
    		
    	}

    	done() {
    		
    	}

    	idle() {
    		
    	}
    }

    const GcdLcm = new CGcdLcm();

    /* src\gcd-lcm\Go.svelte generated by Svelte v3.38.3 */
    const file$8 = "src\\gcd-lcm\\Go.svelte";

    function create_fragment$a(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_go*/ ctx[2]);
    			attr_dev(button, "class", /*_bgColor*/ ctx[3]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*sz*/ ctx[1]);
    			add_location(button, file$8, 15, 0, 452);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*onClick*/ ctx[4], false, false, false),
    					action_destroyer(pulse.call(null, button))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 2) {
    				set_style(button, "font-size", /*sz*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Go", slots, []);
    	let { ga } = $$props;
    	let { sz = "30px" } = $$props;
    	let _go = "GO";
    	let _bgColor = getBgColor(ga);

    	function onClick() {
    		fire$1("--evt-go");
    		Mp3.play(randFrom(["yes", "no", "idle"]));
    	}

    	const writable_props = ["ga", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Go> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		randFrom,
    		pulse,
    		Mp3,
    		getBgColor,
    		fire: fire$1,
    		ga,
    		sz,
    		_go,
    		_bgColor,
    		onClick
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    		if ("_go" in $$props) $$invalidate(2, _go = $$props._go);
    		if ("_bgColor" in $$props) $$invalidate(3, _bgColor = $$props._bgColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, sz, _go, _bgColor, onClick];
    }

    class Go extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { ga: 0, sz: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Go",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Go> was created without expected prop 'ga'");
    		}
    	}

    	get ga() {
    		throw new Error("<Go>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Go>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Go>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Go>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\gcd-lcm\Num.svelte generated by Svelte v3.38.3 */
    const file$7 = "src\\gcd-lcm\\Num.svelte";

    function create_fragment$9(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_num*/ ctx[2]);
    			attr_dev(button, "class", /*_bgColor*/ ctx[3]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*sz*/ ctx[1]);
    			add_location(button, file$7, 12, 0, 272);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = action_destroyer(pulse.call(null, button));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_num*/ 4) set_data_dev(t, /*_num*/ ctx[2]);

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 2) {
    				set_style(button, "font-size", /*sz*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Num", slots, []);
    	let { ga } = $$props;
    	let { sz = "30px" } = $$props;
    	let _num = 2;
    	let _bgColor = getBgColor(ga);

    	function setModel(num) {
    		$$invalidate(2, _num = num);
    	}

    	const writable_props = ["ga", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Num> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		getBgColor,
    		ga,
    		sz,
    		_num,
    		_bgColor,
    		setModel
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    		if ("_num" in $$props) $$invalidate(2, _num = $$props._num);
    		if ("_bgColor" in $$props) $$invalidate(3, _bgColor = $$props._bgColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, sz, _num, _bgColor, setModel];
    }

    class Num$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { ga: 0, sz: 1, setModel: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Num",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Num> was created without expected prop 'ga'");
    		}
    	}

    	get ga() {
    		throw new Error("<Num>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Num>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Num>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Num>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setModel() {
    		return this.$$.ctx[4];
    	}

    	set setModel(value) {
    		throw new Error("<Num>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\gcd-lcm\Factor.svelte generated by Svelte v3.38.3 */
    const file$6 = "src\\gcd-lcm\\Factor.svelte";

    function create_fragment$8(ctx) {
    	let button;

    	let t_value = (/*pow*/ ctx[2] > 0
    	? /*value*/ ctx[4]
    	: /*_*/ ctx[3].factor) + "";

    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", /*bgColor*/ ctx[5]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*sz*/ ctx[1]);
    			add_location(button, file$6, 33, 0, 698);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*onClick*/ ctx[6], false, false, false),
    					action_destroyer(pulse.call(null, button))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*pow, value, _*/ 28 && t_value !== (t_value = (/*pow*/ ctx[2] > 0
    			? /*value*/ ctx[4]
    			: /*_*/ ctx[3].factor) + "")) set_data_dev(t, t_value);

    			if (dirty & /*bgColor*/ 32) {
    				attr_dev(button, "class", /*bgColor*/ ctx[5]);
    			}

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 2) {
    				set_style(button, "font-size", /*sz*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let bgColor;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Factor", slots, []);
    	
    	let { ga } = $$props;
    	let { sz = "30px" } = $$props;

    	let _ = {
    		factor: 2,
    		mxPow: 3,
    		value: 1,
    		wrong: false
    	};

    	let value;
    	let wrong = false;
    	let pow = 0;

    	function onClick() {
    		if ($$invalidate(2, pow++, pow) == _.mxPow) $$invalidate(2, pow = 0);
    		$$invalidate(3, _.value = Math.pow(_.factor, pow), _);
    		fire$1("--evt-acted");
    		update();
    	}

    	function update() {
    		$$invalidate(4, value = _.value);
    		$$invalidate(9, wrong = _.wrong);
    	}

    	function setModel(model) {
    		$$invalidate(3, _ = model);
    	}

    	on$1("--cmd-update-views", () => update());
    	const writable_props = ["ga", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Factor> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		fire: fire$1,
    		on: on$1,
    		ga,
    		sz,
    		_,
    		value,
    		wrong,
    		pow,
    		onClick,
    		update,
    		setModel,
    		bgColor
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    		if ("_" in $$props) $$invalidate(3, _ = $$props._);
    		if ("value" in $$props) $$invalidate(4, value = $$props.value);
    		if ("wrong" in $$props) $$invalidate(9, wrong = $$props.wrong);
    		if ("pow" in $$props) $$invalidate(2, pow = $$props.pow);
    		if ("bgColor" in $$props) $$invalidate(5, bgColor = $$props.bgColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*wrong, pow*/ 516) {
    			$$invalidate(5, bgColor = wrong
    			? "bg-red-100"
    			: pow > 0 ? "bg-green-100" : "bg-gray-100");
    		}
    	};

    	return [ga, sz, pow, _, value, bgColor, onClick, update, setModel, wrong];
    }

    class Factor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { ga: 0, sz: 1, update: 7, setModel: 8 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Factor",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Factor> was created without expected prop 'ga'");
    		}
    	}

    	get ga() {
    		throw new Error("<Factor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Factor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Factor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Factor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get update() {
    		return this.$$.ctx[7];
    	}

    	set update(value) {
    		throw new Error("<Factor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setModel() {
    		return this.$$.ctx[8];
    	}

    	set setModel(value) {
    		throw new Error("<Factor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\gcd-lcm\Count.svelte generated by Svelte v3.38.3 */
    const file$5 = "src\\gcd-lcm\\Count.svelte";

    function create_fragment$7(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_count*/ ctx[2]);
    			attr_dev(button, "class", /*_bgColor*/ ctx[3]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*sz*/ ctx[1]);
    			add_location(button, file$5, 11, 0, 278);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = action_destroyer(pulse.call(null, button));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_count*/ 4) set_data_dev(t, /*_count*/ ctx[2]);

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 2) {
    				set_style(button, "font-size", /*sz*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Count", slots, []);
    	let _count = 1;
    	let { ga } = $$props;
    	let { sz = "20px" } = $$props;
    	let _bgColor = getBgColor(ga);

    	function setModel(count) {
    		$$invalidate(2, _count = count);
    	}

    	const writable_props = ["ga", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Count> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		getBgColor,
    		_count,
    		ga,
    		sz,
    		_bgColor,
    		setModel
    	});

    	$$self.$inject_state = $$props => {
    		if ("_count" in $$props) $$invalidate(2, _count = $$props._count);
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("sz" in $$props) $$invalidate(1, sz = $$props.sz);
    		if ("_bgColor" in $$props) $$invalidate(3, _bgColor = $$props._bgColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, sz, _count, _bgColor, setModel];
    }

    class Count$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { ga: 0, sz: 1, setModel: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Count",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Count> was created without expected prop 'ga'");
    		}
    	}

    	get ga() {
    		throw new Error("<Count>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Count>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Count>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Count>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setModel() {
    		return this.$$.ctx[4];
    	}

    	set setModel(value) {
    		throw new Error("<Count>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\gcd-lcm\Main.svelte generated by Svelte v3.38.3 */

    const { console: console_1 } = globals;

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	child_ctx[17] = list;
    	child_ctx[18] = i;
    	return child_ctx;
    }

    // (96:4) <Grid layout={l1} ga="l1">
    function create_default_slot_3(ctx) {
    	let count;
    	let t;
    	let clock;
    	let current;
    	let count_props = { ga: "cnt" };
    	count = new Count$1({ props: count_props, $$inline: true });
    	/*count_binding*/ ctx[6](count);
    	clock = new Clock({ props: { ga: "clk" }, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(count.$$.fragment);
    			t = space();
    			create_component(clock.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(count, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(clock, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const count_changes = {};
    			count.$set(count_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(count.$$.fragment, local);
    			transition_in(clock.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(count.$$.fragment, local);
    			transition_out(clock.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			/*count_binding*/ ctx[6](null);
    			destroy_component(count, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(clock, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(96:4) <Grid layout={l1} ga=\\\"l1\\\">",
    		ctx
    	});

    	return block;
    }

    // (101:4) <Grid layout={l2} ga="l2">
    function create_default_slot_2(ctx) {
    	let num0;
    	let t;
    	let num1;
    	let current;
    	let num0_props = { ga: "lhs" };
    	num0 = new Num$1({ props: num0_props, $$inline: true });
    	/*num0_binding*/ ctx[7](num0);
    	let num1_props = { ga: "rhs" };
    	num1 = new Num$1({ props: num1_props, $$inline: true });
    	/*num1_binding*/ ctx[8](num1);

    	const block = {
    		c: function create() {
    			create_component(num0.$$.fragment);
    			t = space();
    			create_component(num1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(num0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(num1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const num0_changes = {};
    			num0.$set(num0_changes);
    			const num1_changes = {};
    			num1.$set(num1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(num0.$$.fragment, local);
    			transition_in(num1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(num0.$$.fragment, local);
    			transition_out(num1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			/*num0_binding*/ ctx[7](null);
    			destroy_component(num0, detaching);
    			if (detaching) detach_dev(t);
    			/*num1_binding*/ ctx[8](null);
    			destroy_component(num1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(101:4) <Grid layout={l2} ga=\\\"l2\\\">",
    		ctx
    	});

    	return block;
    }

    // (107:8) {#each range(0, 8) as no}
    function create_each_block$1(ctx) {
    	let factor;
    	let no = /*no*/ ctx[16];
    	let current;
    	const assign_factor = () => /*factor_binding*/ ctx[9](factor, no);
    	const unassign_factor = () => /*factor_binding*/ ctx[9](null, no);
    	let factor_props = { ga: "" + (/*no*/ ctx[16] + ",") };
    	factor = new Factor({ props: factor_props, $$inline: true });
    	assign_factor();

    	const block = {
    		c: function create() {
    			create_component(factor.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(factor, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (no !== /*no*/ ctx[16]) {
    				unassign_factor();
    				no = /*no*/ ctx[16];
    				assign_factor();
    			}

    			const factor_changes = {};
    			factor.$set(factor_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(factor.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(factor.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			unassign_factor();
    			destroy_component(factor, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(107:8) {#each range(0, 8) as no}",
    		ctx
    	});

    	return block;
    }

    // (106:4) <Grid layout={l3} ga="l3">
    function create_default_slot_1(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = range(0, 8);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*range, view*/ 2) {
    				each_value = range(0, 8);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(106:4) <Grid layout={l3} ga=\\\"l3\\\">",
    		ctx
    	});

    	return block;
    }

    // (95:0) <Grid {layout}>
    function create_default_slot$2(ctx) {
    	let grid0;
    	let t0;
    	let grid1;
    	let t1;
    	let grid2;
    	let t2;
    	let go;
    	let t3;
    	let congrats_1;
    	let current;

    	grid0 = new Grid({
    			props: {
    				layout: /*l1*/ ctx[3],
    				ga: "l1",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	grid1 = new Grid({
    			props: {
    				layout: /*l2*/ ctx[4],
    				ga: "l2",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	grid2 = new Grid({
    			props: {
    				layout: /*l3*/ ctx[5],
    				ga: "l3",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	go = new Go({ props: { ga: "go" }, $$inline: true });
    	go.$on("click", /*click_handler*/ ctx[10]);
    	let congrats_1_props = {};
    	congrats_1 = new Congrats({ props: congrats_1_props, $$inline: true });
    	/*congrats_1_binding*/ ctx[11](congrats_1);

    	const block = {
    		c: function create() {
    			create_component(grid0.$$.fragment);
    			t0 = space();
    			create_component(grid1.$$.fragment);
    			t1 = space();
    			create_component(grid2.$$.fragment);
    			t2 = space();
    			create_component(go.$$.fragment);
    			t3 = space();
    			create_component(congrats_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(grid0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(grid1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(grid2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(go, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(congrats_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const grid0_changes = {};

    			if (dirty & /*$$scope, view*/ 524290) {
    				grid0_changes.$$scope = { dirty, ctx };
    			}

    			grid0.$set(grid0_changes);
    			const grid1_changes = {};

    			if (dirty & /*$$scope, view*/ 524290) {
    				grid1_changes.$$scope = { dirty, ctx };
    			}

    			grid1.$set(grid1_changes);
    			const grid2_changes = {};

    			if (dirty & /*$$scope, view*/ 524290) {
    				grid2_changes.$$scope = { dirty, ctx };
    			}

    			grid2.$set(grid2_changes);
    			const congrats_1_changes = {};
    			congrats_1.$set(congrats_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(grid0.$$.fragment, local);
    			transition_in(grid1.$$.fragment, local);
    			transition_in(grid2.$$.fragment, local);
    			transition_in(go.$$.fragment, local);
    			transition_in(congrats_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(grid0.$$.fragment, local);
    			transition_out(grid1.$$.fragment, local);
    			transition_out(grid2.$$.fragment, local);
    			transition_out(go.$$.fragment, local);
    			transition_out(congrats_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(grid0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(grid1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(grid2, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(go, detaching);
    			if (detaching) detach_dev(t3);
    			/*congrats_1_binding*/ ctx[11](null);
    			destroy_component(congrats_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(95:0) <Grid {layout}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let grid;
    	let current;

    	grid = new Grid({
    			props: {
    				layout: /*layout*/ ctx[2],
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(grid.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(grid, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const grid_changes = {};

    			if (dirty & /*$$scope, congrats, view*/ 524291) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(grid, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Main", slots, []);
    	let congrats;

    	function done() {
    		congrats.play();
    		GcdLcm.done();
    	}

    	on$1("--cmd-new-round", () => GcdLcm.newRound());
    	on$1("--evt-done", () => done());
    	on$1("--cmd-idle", () => GcdLcm.idle());
    	fire$1("--cmd-new-round");

    	let layout = {
    		areas: `
            "l1"
            "l2"
            "l3"
            "l4"
            "go"
        `,
    		cols: `1fr`,
    		rows: `60px 80px 150px 150px 80px`
    	};

    	let l1 = {
    		areas: `
            "cnt . clk"
        `,
    		cols: `2fr 1fr 2fr`,
    		rows: `1fr`
    	};

    	let l2 = {
    		areas: `
            ". lhs rhs ."
        `,
    		cols: `1fr 1fr 1fr 1fr`,
    		rows: `1fr`
    	};

    	let l3 = {
    		areas: `
            "0 1 2 3"
            "4 5 6 7"
        `,
    		cols: `1fr 1fr 1fr 1fr`,
    		rows: `1fr 1fr`
    	};

    	let l4 = {
    		areas: `
            "gcd lcm"
        `,
    		cols: `1fr 1fr`,
    		rows: `1fr`
    	};

    	let gcd = {
    		areas: `
            "d1 d2"
            "d3 d4"
        `,
    		cols: `1fr 1fr`,
    		rows: `1fr 1fr`
    	};

    	let lcm = {
    		areas: `
            "m1 m2"
            "m3 m4"
        `,
    		cols: `1fr 1fr`,
    		rows: `1fr 1fr`
    	};

    	let view = {
    		count: null,
    		nums: new Array(2),
    		factors: new Array(8),
    		gcd: new Array(4),
    		lcm: new Array(4)
    	};

    	on$1("--evt-go", () => {
    		randFrom(GcdLcm.game.divisors).wrong = true;
    		fire$1("--cmd-update-views");
    	});

    	on$1("--cmd-set-models", game => {
    		view.count.setModel(game.roundsLeft);
    		view.nums[0].setModel(game.nums[0]);
    		view.nums[1].setModel(game.nums[1]);
    		game.divisors.forEach((m, i) => view.factors[i].setModel(m));
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Main> was created with unknown prop '${key}'`);
    	});

    	function count_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			view.count = $$value;
    			$$invalidate(1, view);
    		});
    	}

    	function num0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			view.nums[0] = $$value;
    			$$invalidate(1, view);
    		});
    	}

    	function num1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			view.nums[1] = $$value;
    			$$invalidate(1, view);
    		});
    	}

    	function factor_binding($$value, no) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			view.factors[no] = $$value;
    			$$invalidate(1, view);
    		});
    	}

    	const click_handler = () => console.log("GO - main");

    	function congrats_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			congrats = $$value;
    			$$invalidate(0, congrats);
    		});
    	}

    	$$self.$capture_state = () => ({
    		Grid,
    		Clock,
    		rand,
    		randFrom,
    		range,
    		self: GcdLcm,
    		on: on$1,
    		fire: fire$1,
    		Go,
    		Num: Num$1,
    		Factor,
    		Count: Count$1,
    		Congrats,
    		congrats,
    		done,
    		layout,
    		l1,
    		l2,
    		l3,
    		l4,
    		gcd,
    		lcm,
    		view
    	});

    	$$self.$inject_state = $$props => {
    		if ("congrats" in $$props) $$invalidate(0, congrats = $$props.congrats);
    		if ("layout" in $$props) $$invalidate(2, layout = $$props.layout);
    		if ("l1" in $$props) $$invalidate(3, l1 = $$props.l1);
    		if ("l2" in $$props) $$invalidate(4, l2 = $$props.l2);
    		if ("l3" in $$props) $$invalidate(5, l3 = $$props.l3);
    		if ("l4" in $$props) l4 = $$props.l4;
    		if ("gcd" in $$props) gcd = $$props.gcd;
    		if ("lcm" in $$props) lcm = $$props.lcm;
    		if ("view" in $$props) $$invalidate(1, view = $$props.view);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		congrats,
    		view,
    		layout,
    		l1,
    		l2,
    		l3,
    		count_binding,
    		num0_binding,
    		num1_binding,
    		factor_binding,
    		click_handler,
    		congrats_1_binding
    	];
    }

    class Main$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Main",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\zero\Model.svelte generated by Svelte v3.38.3 */



    function on(name, cb) {
    	onAny(name, cb);
    }

    function fire(name, args) {
    	fireAny(name, args);
    }

    function newTimedCmd(cmd, timeout, jitter) {
    	return new CTimedCmd(cmd, timeout, jitter !== null && jitter !== void 0 ? jitter : 0);
    }

    /* src\zero\Count.svelte generated by Svelte v3.38.3 */
    const file$4 = "src\\zero\\Count.svelte";

    function create_fragment$5(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*count*/ ctx[1]);
    			attr_dev(button, "class", /*_bgColor*/ ctx[3]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*sz*/ ctx[2]);
    			add_location(button, file$4, 8, 0, 221);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = action_destroyer(pulse.call(null, button));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*count*/ 2) set_data_dev(t, /*count*/ ctx[1]);

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 4) {
    				set_style(button, "font-size", /*sz*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Count", slots, []);
    	let { ga } = $$props;
    	let { count } = $$props;
    	let { sz = "20px" } = $$props;
    	let _bgColor = getBgColor(ga);
    	const writable_props = ["ga", "count", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Count> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("count" in $$props) $$invalidate(1, count = $$props.count);
    		if ("sz" in $$props) $$invalidate(2, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		getBgColor,
    		ga,
    		count,
    		sz,
    		_bgColor
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("count" in $$props) $$invalidate(1, count = $$props.count);
    		if ("sz" in $$props) $$invalidate(2, sz = $$props.sz);
    		if ("_bgColor" in $$props) $$invalidate(3, _bgColor = $$props._bgColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, count, sz, _bgColor];
    }

    class Count extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { ga: 0, count: 1, sz: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Count",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Count> was created without expected prop 'ga'");
    		}

    		if (/*count*/ ctx[1] === undefined && !("count" in props)) {
    			console.warn("<Count> was created without expected prop 'count'");
    		}
    	}

    	get ga() {
    		throw new Error("<Count>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Count>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get count() {
    		throw new Error("<Count>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set count(value) {
    		throw new Error("<Count>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Count>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Count>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\zero\Num.svelte generated by Svelte v3.38.3 */
    const file$3 = "src\\zero\\Num.svelte";

    function create_fragment$4(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_text*/ ctx[1]);
    			attr_dev(button, "class", /*_bgColor*/ ctx[3]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*_sz*/ ctx[2] + "px");
    			add_location(button, file$3, 11, 0, 286);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = action_destroyer(pulse.call(null, button));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_text*/ 2) set_data_dev(t, /*_text*/ ctx[1]);

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*_sz*/ 4) {
    				set_style(button, "font-size", /*_sz*/ ctx[2] + "px");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let _text;
    	let _sz;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Num", slots, []);
    	let { ga } = $$props;
    	let { num } = $$props;
    	let { sz = 30 } = $$props;
    	let _bgColor = getBgColor(ga);
    	const writable_props = ["ga", "num", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Num> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("num" in $$props) $$invalidate(4, num = $$props.num);
    		if ("sz" in $$props) $$invalidate(5, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		getBgColor,
    		ga,
    		num,
    		sz,
    		_bgColor,
    		_text,
    		_sz
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("num" in $$props) $$invalidate(4, num = $$props.num);
    		if ("sz" in $$props) $$invalidate(5, sz = $$props.sz);
    		if ("_bgColor" in $$props) $$invalidate(3, _bgColor = $$props._bgColor);
    		if ("_text" in $$props) $$invalidate(1, _text = $$props._text);
    		if ("_sz" in $$props) $$invalidate(2, _sz = $$props._sz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*num*/ 16) {
    			$$invalidate(1, _text = num.toLocaleString());
    		}

    		if ($$self.$$.dirty & /*sz, _text*/ 34) {
    			$$invalidate(2, _sz = sz - 1.2 * _text.length);
    		}
    	};

    	return [ga, _text, _sz, _bgColor, num, sz];
    }

    class Num extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { ga: 0, num: 4, sz: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Num",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Num> was created without expected prop 'ga'");
    		}

    		if (/*num*/ ctx[4] === undefined && !("num" in props)) {
    			console.warn("<Num> was created without expected prop 'num'");
    		}
    	}

    	get ga() {
    		throw new Error("<Num>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Num>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get num() {
    		throw new Error("<Num>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set num(value) {
    		throw new Error("<Num>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Num>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Num>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\zero\Ans.svelte generated by Svelte v3.38.3 */
    const file$2 = "src\\zero\\Ans.svelte";

    function create_fragment$3(ctx) {
    	let button;
    	let t_value = /*num*/ ctx[1].toLocaleString() + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", /*_bgColor*/ ctx[2]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*_sz*/ ctx[3] + "px");
    			add_location(button, file$2, 14, 0, 343);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*click_handler*/ ctx[8], false, false, false),
    					action_destroyer(pulse.call(null, button))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*num*/ 2 && t_value !== (t_value = /*num*/ ctx[1].toLocaleString() + "")) set_data_dev(t, t_value);

    			if (dirty & /*_bgColor*/ 4) {
    				attr_dev(button, "class", /*_bgColor*/ ctx[2]);
    			}

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*_sz*/ 8) {
    				set_style(button, "font-size", /*_sz*/ ctx[3] + "px");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let _text;
    	let _scale;
    	let _sz;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Ans", slots, []);
    	let { ga } = $$props;
    	let { num } = $$props;
    	let { sz = 30 } = $$props;
    	let _bgColor = "bg-gray-100";

    	function setBgColor(value) {
    		$$invalidate(2, _bgColor = value);
    	}

    	const writable_props = ["ga", "num", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Ans> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("num" in $$props) $$invalidate(1, num = $$props.num);
    		if ("sz" in $$props) $$invalidate(4, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		ga,
    		num,
    		sz,
    		_bgColor,
    		setBgColor,
    		_text,
    		_scale,
    		_sz
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("num" in $$props) $$invalidate(1, num = $$props.num);
    		if ("sz" in $$props) $$invalidate(4, sz = $$props.sz);
    		if ("_bgColor" in $$props) $$invalidate(2, _bgColor = $$props._bgColor);
    		if ("_text" in $$props) $$invalidate(6, _text = $$props._text);
    		if ("_scale" in $$props) $$invalidate(7, _scale = $$props._scale);
    		if ("_sz" in $$props) $$invalidate(3, _sz = $$props._sz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*num*/ 2) {
    			$$invalidate(6, _text = num.toLocaleString());
    		}

    		if ($$self.$$.dirty & /*_text*/ 64) {
    			$$invalidate(7, _scale = _text.length < 5 ? 1.2 : 1.5);
    		}

    		if ($$self.$$.dirty & /*sz, _scale, _text*/ 208) {
    			$$invalidate(3, _sz = sz - _scale * _text.length);
    		}
    	};

    	return [ga, num, _bgColor, _sz, sz, setBgColor, _text, _scale, click_handler];
    }

    class Ans extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { ga: 0, num: 1, sz: 4, setBgColor: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ans",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Ans> was created without expected prop 'ga'");
    		}

    		if (/*num*/ ctx[1] === undefined && !("num" in props)) {
    			console.warn("<Ans> was created without expected prop 'num'");
    		}
    	}

    	get ga() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get num() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set num(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setBgColor() {
    		return this.$$.ctx[5];
    	}

    	set setBgColor(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\zero\Op.svelte generated by Svelte v3.38.3 */
    const file$1 = "src\\zero\\Op.svelte";

    function create_fragment$2(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*op*/ ctx[1]);
    			attr_dev(button, "class", /*_bgColor*/ ctx[3]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*sz*/ ctx[2]);
    			add_location(button, file$1, 9, 0, 263);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false),
    					action_destroyer(pulse.call(null, button))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*op*/ 2) set_data_dev(t, /*op*/ ctx[1]);

    			if (dirty & /*ga*/ 1) {
    				set_style(button, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*sz*/ 4) {
    				set_style(button, "font-size", /*sz*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Op", slots, []);
    	let { ga } = $$props;
    	let { op } = $$props;
    	let { sz = "30px" } = $$props;
    	let _bgColor = getBgColor(ga);
    	const writable_props = ["ga", "op", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Op> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => Mp3.playRandom();

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("op" in $$props) $$invalidate(1, op = $$props.op);
    		if ("sz" in $$props) $$invalidate(2, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		Mp3,
    		getBgColor,
    		ga,
    		op,
    		sz,
    		_bgColor
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("op" in $$props) $$invalidate(1, op = $$props.op);
    		if ("sz" in $$props) $$invalidate(2, sz = $$props.sz);
    		if ("_bgColor" in $$props) $$invalidate(3, _bgColor = $$props._bgColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, op, sz, _bgColor, click_handler];
    }

    class Op extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { ga: 0, op: 1, sz: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Op",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Op> was created without expected prop 'ga'");
    		}

    		if (/*op*/ ctx[1] === undefined && !("op" in props)) {
    			console.warn("<Op> was created without expected prop 'op'");
    		}
    	}

    	get ga() {
    		throw new Error("<Op>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Op>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get op() {
    		throw new Error("<Op>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set op(value) {
    		throw new Error("<Op>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Op>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Op>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\zero\Main.svelte generated by Svelte v3.38.3 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	child_ctx[23] = list;
    	child_ctx[24] = i;
    	return child_ctx;
    }

    // (183:4) {#each range(0, 4) as i}
    function create_each_block(ctx) {
    	let ans;
    	let i = /*i*/ ctx[22];
    	let current;
    	const assign_ans = () => /*ans_binding*/ ctx[7](ans, i);
    	const unassign_ans = () => /*ans_binding*/ ctx[7](null, i);

    	function click_handler() {
    		return /*click_handler*/ ctx[8](/*i*/ ctx[22]);
    	}

    	let ans_props = {
    		ga: `a${/*i*/ ctx[22]}`,
    		num: /*_game*/ ctx[1].answers[/*i*/ ctx[22]]
    	};

    	ans = new Ans({ props: ans_props, $$inline: true });
    	assign_ans();
    	ans.$on("click", click_handler);

    	const block = {
    		c: function create() {
    			create_component(ans.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(ans, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (i !== /*i*/ ctx[22]) {
    				unassign_ans();
    				i = /*i*/ ctx[22];
    				assign_ans();
    			}

    			const ans_changes = {};
    			if (dirty & /*_game*/ 2) ans_changes.num = /*_game*/ ctx[1].answers[/*i*/ ctx[22]];
    			ans.$set(ans_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(ans.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(ans.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			unassign_ans();
    			destroy_component(ans, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(183:4) {#each range(0, 4) as i}",
    		ctx
    	});

    	return block;
    }

    // (174:0) <Grid {layout}      on:click={() => fire("--evt-click")}  >
    function create_default_slot$1(ctx) {
    	let count;
    	let t0;
    	let clock;
    	let t1;
    	let num0;
    	let t2;
    	let op;
    	let t3;
    	let num1;
    	let t4;
    	let t5;
    	let congrats_1;
    	let current;

    	count = new Count({
    			props: { ga: "cnt", count: /*_roundsLeft*/ ctx[3] },
    			$$inline: true
    		});

    	clock = new Clock({ props: { ga: "clk" }, $$inline: true });

    	num0 = new Num({
    			props: { ga: "lhs", num: /*_game*/ ctx[1].nums[0] },
    			$$inline: true
    		});

    	op = new Op({
    			props: { ga: "op", op: /*_game*/ ctx[1].op },
    			$$inline: true
    		});

    	num1 = new Num({
    			props: { ga: "rhs", num: /*_game*/ ctx[1].nums[1] },
    			$$inline: true
    		});

    	let each_value = range(0, 4);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let congrats_1_props = {};
    	congrats_1 = new Congrats({ props: congrats_1_props, $$inline: true });
    	/*congrats_1_binding*/ ctx[9](congrats_1);

    	const block = {
    		c: function create() {
    			create_component(count.$$.fragment);
    			t0 = space();
    			create_component(clock.$$.fragment);
    			t1 = space();
    			create_component(num0.$$.fragment);
    			t2 = space();
    			create_component(op.$$.fragment);
    			t3 = space();
    			create_component(num1.$$.fragment);
    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			create_component(congrats_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(count, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(clock, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(num0, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(op, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(num1, target, anchor);
    			insert_dev(target, t4, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t5, anchor);
    			mount_component(congrats_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const count_changes = {};
    			if (dirty & /*_roundsLeft*/ 8) count_changes.count = /*_roundsLeft*/ ctx[3];
    			count.$set(count_changes);
    			const num0_changes = {};
    			if (dirty & /*_game*/ 2) num0_changes.num = /*_game*/ ctx[1].nums[0];
    			num0.$set(num0_changes);
    			const op_changes = {};
    			if (dirty & /*_game*/ 2) op_changes.op = /*_game*/ ctx[1].op;
    			op.$set(op_changes);
    			const num1_changes = {};
    			if (dirty & /*_game*/ 2) num1_changes.num = /*_game*/ ctx[1].nums[1];
    			num1.$set(num1_changes);

    			if (dirty & /*range, _game, answers, select*/ 22) {
    				each_value = range(0, 4);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t5.parentNode, t5);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			const congrats_1_changes = {};
    			congrats_1.$set(congrats_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(count.$$.fragment, local);
    			transition_in(clock.$$.fragment, local);
    			transition_in(num0.$$.fragment, local);
    			transition_in(op.$$.fragment, local);
    			transition_in(num1.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(congrats_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(count.$$.fragment, local);
    			transition_out(clock.$$.fragment, local);
    			transition_out(num0.$$.fragment, local);
    			transition_out(op.$$.fragment, local);
    			transition_out(num1.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(congrats_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(count, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(clock, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(num0, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(op, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(num1, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t5);
    			/*congrats_1_binding*/ ctx[9](null);
    			destroy_component(congrats_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(174:0) <Grid {layout}      on:click={() => fire(\\\"--evt-click\\\")}  >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let grid;
    	let current;

    	grid = new Grid({
    			props: {
    				layout: /*layout*/ ctx[5],
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	grid.$on("click", /*click_handler_1*/ ctx[10]);

    	const block = {
    		c: function create() {
    			create_component(grid.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(grid, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const grid_changes = {};

    			if (dirty & /*$$scope, congrats, _game, answers, _roundsLeft*/ 33554447) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(grid, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let _roundsLeft;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Main", slots, []);
    	
    	let congrats;
    	let _game;
    	let _current = 0;
    	let _rounds = [];
    	let _config = Anki.getConfig();
    	let _tcNewRound = newTimedCmd("--cmd-next-round", 1000);
    	let _tcIdle = newTimedCmd("--cmd-idle", 7000, 3000);
    	let answers = [null, null, null];

    	function getAbPair() {
    		let line = Anki.getCard().content.split(",").map(x => parseInt(x));
    		let a = rand(1, 9);
    		let b = rand(2, 9);
    		let f = b + pm(1);
    		let noOfZeros = rand(line[0], line[1]);

    		for (let no = noOfZeros; no-- > 0; ) {
    			if (a === 1) {
    				// ensure first factor is not one
    				a *= 10;

    				continue;
    			}

    			switch (trueFalse()) {
    				case true:
    					a *= 10;
    					break;
    				case false:
    					b *= 10;
    					f *= 10;
    					break;
    			}
    		}

    		return { a, b, f };
    	}

    	function addMulRound() {
    		let op = "x";
    		let pair = getAbPair();
    		let lhs = pair.a;
    		let rhs = pair.b;
    		let a0 = lhs * rhs;
    		let a1 = lhs * pair.f;
    		let a2, a3;

    		switch (trueFalse()) {
    			case true:
    				a2 = a0 * 10;
    				a3 = a1 * 10;
    				break;
    			case false:
    				a2 = a0 / 10;
    				a3 = a1 / 10;
    				break;
    		}

    		let nums = shuffle([lhs, rhs]);
    		let answers = shuffle([a0, a1, a2, a3]);
    		let rightAt = answers.findIndex(x => x == a0);
    		_rounds.push({ nums, op, answers, rightAt });
    	}

    	function addDivRound() {
    		let op = "/";
    		let pair = getAbPair();
    		let lhs = pair.a * pair.b;
    		let rhs = pair.a;
    		let a0 = pair.b;
    		let a1 = pair.f;
    		let a2, a3;

    		switch (trueFalse()) {
    			case true:
    				a2 = a0 * 10;
    				a3 = a1 * 10;
    				break;
    			case false:
    				a2 = a0 >= 10 ? a0 / 10 : a0 + pm(1);
    				a3 = a1 >= 10 ? a1 / 10 : a1 + pm(1);
    				break;
    		}

    		while ([a0, a1, a2].find(x => x === a3)) a3++; // can happen
    		let nums = [lhs, rhs];
    		let answers = shuffle([a0, a1, a2, a3]);
    		let rightAt = answers.findIndex(x => x === a0);
    		_rounds.push({ nums, op, answers, rightAt });
    	}

    	function nextRound() {
    		_tcNewRound.cancel();
    		_tcIdle.reset();

    		if ($$invalidate(6, ++_current) === _rounds.length) {
    			addMulRound();
    			addDivRound();
    		}

    		$$invalidate(1, _game = _rounds[_current]);
    		answers.forEach(ans => ans.setBgColor("bg-gray-100"));
    	}

    	function init() {
    		var _a;
    		_tcIdle.reset();
    		let noOfRounds = (_a = _config.rounds) !== null && _a !== void 0 ? _a : 4;

    		for (let cnt = noOfRounds; cnt-- > 0; ) {
    			addMulRound();
    			addDivRound();
    		}

    		$$invalidate(1, _game = _rounds[_current]);
    	}

    	function select(no) {
    		_tcIdle.reset();

    		if (_game.clickedAt !== undefined) {
    			fire("--cmd-next-round");
    			return;
    		}

    		$$invalidate(1, _game.clickedAt = no, _game);

    		if (no === _game.rightAt) {
    			if (_current == _rounds.length - 1) {
    				Mp3.play("done");
    				congrats.play();
    			} else {
    				Mp3.play("yes");
    			}

    			_tcNewRound.reset();
    		} else {
    			Mp3.play("no");
    			answers[no].setBgColor("bg-red-200");
    			addMulRound();
    			addDivRound();
    			$$invalidate(3, _roundsLeft = _rounds.length - _current);
    		}

    		answers[_game.rightAt].setBgColor("bg-green-200");
    	}

    	function onClick() {
    		if (_game.clickedAt !== undefined) fire("--cmd-next-round");
    	}

    	function idle() {
    		_tcIdle.reset();
    		Mp3.play("idle");
    	}

    	on("--cmd-next-round", () => nextRound());
    	on("--evt-click", () => onClick());
    	on("--cmd-idle", () => idle());
    	init();

    	let layout = {
    		areas: `
            "cnt   .    clk "
            "lhs   op   rhs "
            "a0    .    a1  "
            "a2    .    a3  "
        `,
    		cols: `2fr 1fr 2fr`,
    		rows: `60px 80px 80px 80px`,
    		bgColors: {
    			cnt: "bg-purple-300",
    			lhs: "bg-green-100",
    			op: "bg-yellow-200",
    			rhs: "bg-green-100"
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Main> was created with unknown prop '${key}'`);
    	});

    	function ans_binding($$value, i) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			answers[i] = $$value;
    			$$invalidate(2, answers);
    		});
    	}

    	const click_handler = i => select(i);

    	function congrats_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			congrats = $$value;
    			$$invalidate(0, congrats);
    		});
    	}

    	const click_handler_1 = () => fire("--evt-click");

    	$$self.$capture_state = () => ({
    		rand,
    		shuffle,
    		range,
    		pm,
    		trueFalse,
    		randFrom,
    		Anki,
    		Mp3,
    		Grid,
    		Clock,
    		Congrats,
    		on,
    		fire,
    		newTimedCmd,
    		Count,
    		Num,
    		Ans,
    		Op,
    		congrats,
    		_game,
    		_current,
    		_rounds,
    		_config,
    		_tcNewRound,
    		_tcIdle,
    		answers,
    		getAbPair,
    		addMulRound,
    		addDivRound,
    		nextRound,
    		init,
    		select,
    		onClick,
    		idle,
    		layout,
    		_roundsLeft
    	});

    	$$self.$inject_state = $$props => {
    		if ("congrats" in $$props) $$invalidate(0, congrats = $$props.congrats);
    		if ("_game" in $$props) $$invalidate(1, _game = $$props._game);
    		if ("_current" in $$props) $$invalidate(6, _current = $$props._current);
    		if ("_rounds" in $$props) $$invalidate(11, _rounds = $$props._rounds);
    		if ("_config" in $$props) _config = $$props._config;
    		if ("_tcNewRound" in $$props) _tcNewRound = $$props._tcNewRound;
    		if ("_tcIdle" in $$props) _tcIdle = $$props._tcIdle;
    		if ("answers" in $$props) $$invalidate(2, answers = $$props.answers);
    		if ("layout" in $$props) $$invalidate(5, layout = $$props.layout);
    		if ("_roundsLeft" in $$props) $$invalidate(3, _roundsLeft = $$props._roundsLeft);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*_current*/ 64) {
    			$$invalidate(3, _roundsLeft = _rounds.length - _current);
    		}
    	};

    	return [
    		congrats,
    		_game,
    		answers,
    		_roundsLeft,
    		select,
    		layout,
    		_current,
    		ans_binding,
    		click_handler,
    		congrats_1_binding,
    		click_handler_1
    	];
    }

    class Main extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Main",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.38.3 */
    const file = "src\\App.svelte";

    // (49:0) <Grid {layout}>
    function create_default_slot(ctx) {
    	let div;
    	let switch_instance;
    	let t0;
    	let powered;
    	let t1;
    	let version;
    	let current;
    	var switch_value = /*loadGame*/ ctx[0]();

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	powered = new Powered({
    			props: {
    				ga: "pwrd",
    				text: "Powered by gebemot.online"
    			},
    			$$inline: true
    		});

    	version = new Version({
    			props: { ga: "ver", v: "0.3.5" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			t0 = space();
    			create_component(powered.$$.fragment);
    			t1 = space();
    			create_component(version.$$.fragment);
    			attr_dev(div, "class", "w-full h-full");
    			set_style(div, "grid-area", "game");
    			add_location(div, file, 49, 4, 1435);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, div, null);
    			}

    			insert_dev(target, t0, anchor);
    			mount_component(powered, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(version, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = /*loadGame*/ ctx[0]())) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div, null);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			transition_in(powered.$$.fragment, local);
    			transition_in(version.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			transition_out(powered.$$.fragment, local);
    			transition_out(version.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (switch_instance) destroy_component(switch_instance);
    			if (detaching) detach_dev(t0);
    			destroy_component(powered, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(version, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(49:0) <Grid {layout}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let grid;
    	let t;
    	let logger;
    	let current;

    	grid = new Grid({
    			props: {
    				layout: /*layout*/ ctx[1],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	logger = new Logger({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(grid.$$.fragment);
    			t = space();
    			create_component(logger.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(grid, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(logger, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const grid_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			transition_in(logger.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(grid.$$.fragment, local);
    			transition_out(logger.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(grid, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(logger, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);

    	onMount(() => {
    		Anki.hideLoader();
    		refreshMath();
    	});

    	function loadGame() {
    		try {
    			let config = Anki.getConfig();
    			Mp3.buildMp3Library("assets", config.soundOn);

    			switch (config.game) {
    				case "plus-over":
    				case "mul-div":
    					return Main$2;
    				case "gcd-lcm":
    					return Main$1;
    				case "zero":
    					return Main;
    				default:
    					error(`Unknown game type: '${config.game}'`);
    					return Oops;
    			}
    		} catch(err) {
    			error("Failed to loadGame", err);
    		}
    	}

    	let layout = {
    		areas: `
            "game  game  game  game"
            "pwrd  pwrd  .     ver"
        `,
    		cols: `1fr 1fr 1ft 1fr`,
    		rows: `98fr 2fr`
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		Oops,
    		Logger,
    		Grid,
    		Version,
    		Powered,
    		error,
    		Anki,
    		refreshMath,
    		Mp3,
    		PlusOver: Main$2,
    		GcdLcm: Main$1,
    		Zero: Main,
    		loadGame,
    		layout
    	});

    	$$self.$inject_state = $$props => {
    		if ("layout" in $$props) $$invalidate(1, layout = $$props.layout);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [loadGame, layout];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
