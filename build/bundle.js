
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
    function tick() {
        schedule_update();
        return resolved_promise;
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
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
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

    const file$o = "src\\core\\Oops.svelte";

    function create_fragment$s(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Oops...";
    			add_location(p, file$o, 0, 0, 0);
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
    		id: create_fragment$s.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$s($$self, $$props) {
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
    		init(this, options, instance$s, create_fragment$s, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Oops",
    			options,
    			id: create_fragment$s.name
    		});
    	}
    }

    /* src\core\Logger.svelte generated by Svelte v3.38.3 */

    const file$n = "src\\core\\Logger.svelte";

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (25:0) {#each lines as line}
    function create_each_block$5(ctx) {
    	let p;
    	let t_value = /*line*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file$n, 25, 4, 600);
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
    		id: create_each_block$5.name,
    		type: "each",
    		source: "(25:0) {#each lines as line}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$r(ctx) {
    	let each_1_anchor;
    	let each_value = /*lines*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
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
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
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
    		id: create_fragment$r.name,
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

    function instance$r($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$r, create_fragment$r, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Logger",
    			options,
    			id: create_fragment$r.name
    		});
    	}
    }

    /* src\core\Grid.svelte generated by Svelte v3.38.3 */
    const file$m = "src\\core\\Grid.svelte";

    function create_fragment$q(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", div_class_value = "my-grid " + /*bgColor*/ ctx[2] + " svelte-1hqqd40");
    			set_style(div, "grid-area", /*ga*/ ctx[1]);
    			set_style(div, "--areas", /*layout*/ ctx[0].areas);
    			set_style(div, "--cols", /*layout*/ ctx[0].cols);
    			set_style(div, "--rows", /*layout*/ ctx[0].rows);
    			add_location(div, file$m, 22, 0, 834);
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
    				dispose = listen_dev(div, "click", self$1(/*click_handler*/ ctx[5]), false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*bgColor*/ 4 && div_class_value !== (div_class_value = "my-grid " + /*bgColor*/ ctx[2] + " svelte-1hqqd40")) {
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
    		id: create_fragment$q.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getBgColor(ga, $default) {
    	let fn = getContext("get-bg-color");

    	if (!fn) return $default !== null && $default !== void 0
    	? $default
    	: "bg-transparent";

    	let bgColor = fn(ga, $default);

    	// console.log(`${ga}: ${bgColor}`);
    	return bgColor;
    }

    function instance$q($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Grid", slots, ['default']);
    	let { layout } = $$props;
    	let { ga = "unset" } = $$props;
    	let { bgColor = getBgColor(ga) } = $$props;

    	setContext("get-bg-color", function (ga, $default) {
    		var _a, _b;

    		if (!layout.bgColors) return $default !== null && $default !== void 0
    		? $default
    		: "bg-transparent";

    		return (_b = (_a = layout.bgColors[ga]) !== null && _a !== void 0
    		? _a
    		: $default) !== null && _b !== void 0
    		? _b
    		: "bg-transparent";
    	});

    	const writable_props = ["layout", "ga", "bgColor"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Grid> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("layout" in $$props) $$invalidate(0, layout = $$props.layout);
    		if ("ga" in $$props) $$invalidate(1, ga = $$props.ga);
    		if ("bgColor" in $$props) $$invalidate(2, bgColor = $$props.bgColor);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		setContext,
    		getBgColor,
    		layout,
    		ga,
    		bgColor
    	});

    	$$self.$inject_state = $$props => {
    		if ("layout" in $$props) $$invalidate(0, layout = $$props.layout);
    		if ("ga" in $$props) $$invalidate(1, ga = $$props.ga);
    		if ("bgColor" in $$props) $$invalidate(2, bgColor = $$props.bgColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [layout, ga, bgColor, $$scope, slots, click_handler];
    }

    class Grid extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$q, create_fragment$q, safe_not_equal, { layout: 0, ga: 1, bgColor: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Grid",
    			options,
    			id: create_fragment$q.name
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

    	get bgColor() {
    		throw new Error("<Grid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bgColor(value) {
    		throw new Error("<Grid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\core\Version.svelte generated by Svelte v3.38.3 */

    const file$l = "src\\core\\Version.svelte";

    function create_fragment$p(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*v*/ ctx[1]);
    			attr_dev(span, "class", "text-xs text-gray-300");
    			set_style(span, "grid-area", /*ga*/ ctx[0]);
    			add_location(span, file$l, 4, 0, 62);
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
    		id: create_fragment$p.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$p($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$p, create_fragment$p, safe_not_equal, { ga: 0, v: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Version",
    			options,
    			id: create_fragment$p.name
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

    const file$k = "src\\core\\Powered.svelte";

    function create_fragment$o(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*text*/ ctx[1]);
    			attr_dev(span, "class", "text-xs text-gray-400");
    			set_style(span, "grid-area", /*ga*/ ctx[0]);
    			add_location(span, file$k, 4, 0, 65);
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
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$o, create_fragment$o, safe_not_equal, { ga: 0, text: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Powered",
    			options,
    			id: create_fragment$o.name
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

    /* src\core\Helpers.svelte generated by Svelte v3.38.3 */

    function rand(min, max) {
    	min = Math.ceil(min);
    	max = Math.floor(max + 1);
    	return Math.floor(Math.random() * (max - min) + min);
    }

    function randFrom(arr) {
    	return arr[rand(0, arr.length - 1)];
    }

    function randFromIf(arr, iff) {
    	let filtered = arr.filter(iff);

    	// assert there is any number in filtered array
    	return filtered[rand(0, filtered.length - 1)];
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

    function randId(len, charSet) {
    	charSet !== null && charSet !== void 0
    	? charSet
    	: charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    	var str = "";

    	for (var i = 0; i < len; i++) {
    		var indx = Math.floor(Math.random() * charSet.length);
    		str += charSet.charAt(indx);
    	}

    	return str;
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

    function safe(func) {
    	try {
    		return func();
    	} catch(err) {
    		let name = func.name;
    		if (name === "") name = "unknown";
    		error(`Error in ${name}`, err);
    	}
    }

    function splitNoEmpty(str, delim) {
    	return str.trim().split(delim !== null && delim !== void 0 ? delim : " ").filter(Boolean);
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

    	*commands() {
    		let content = ankiCard.content.replace("\n", " ");
    		if (!content.includes(";")) return;
    		let cmds = ankiCard.content.split(";")[0];

    		for (let cmd of splitNoEmpty(cmds, ",")) {
    			yield splitNoEmpty(cmd, " ");
    		}
    	}

    	tokens() {
    		let content = ankiCard.content.replace("\n", " ");
    		let tkns = content.includes(";") ? content.split(";")[1] : content;
    		return splitNoEmpty(tkns, ",");
    	}
    }

    const Anki = new CAnki();

    /* src\core\MathJax.svelte generated by Svelte v3.38.3 */

    var __awaiter$2 = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
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

    let _initialized = false;
    let _refreshIsRequested = false;

    // refreshes are delayed on initialization
    function refresh() {
    	if (!_refreshIsRequested) return;
    	_refreshIsRequested = false;
    	safe(() => MathJax.typeset());
    }

    function refreshMath() {
    	_refreshIsRequested = true;
    	if (!_initialized) return;
    	run(refresh);
    }

    function initMath() {
    	run(() => __awaiter$2(this, void 0, void 0, function* () {
    		yield delay(2000);
    		_initialized = true;
    		refresh();
    	}));
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

    /* src\core\DragHandler.svelte generated by Svelte v3.38.3 */

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
    let _activeDrags = new Set();

    function beingDragged(elem) {
    	return _activeDrags.has(elem);
    }

    function handleDragEvents(elem, options) {
    	var _a, _b;

    	let _config = {
    		id: (_a = options === null || options === void 0
    		? void 0
    		: options.id) !== null && _a !== void 0
    		? _a
    		: randId(5),
    		snapTo: (_b = options === null || options === void 0
    		? void 0
    		: options.snapTo) !== null && _b !== void 0
    		? _b
    		: [1, 1]
    	};

    	let _myId = -1;
    	let _start = { x: 0, y: 0 };
    	let _last = { x: 0, y: 0 };
    	let _skippedMoves = 0;

    	function fire(name, args) {
    		switch (name) {
    			case "drag:start":
    				_activeDrags.add(elem);
    				break;
    			case "drag:end":
    				_activeDrags.delete(elem);
    				break;
    		}

    		elem.dispatchEvent(new CustomEvent(name, { detail: args }));
    	}

    	function makeArgs(touch, start) {
    		let pnt = {
    			x: 0.5 + touch.clientX | 0,
    			y: 0.5 + touch.clientY | 0
    		};

    		start !== null && start !== void 0 ? start : start = pnt;
    		let offset = { x: pnt.x - start.x, y: pnt.y - start.y };
    		return { id: _config.id, start, offset };
    	}

    	function snapToGrid(args, last) {
    		let sameCell = Math.abs(last.x - args.offset.x) < _config.snapTo[0] && Math.abs(last.y - args.offset.y) < _config.snapTo[1];
    		if (sameCell) return false;
    		args.offset.x -= args.offset.x % _config.snapTo[0];
    		args.offset.y -= args.offset.y % _config.snapTo[1];
    		return true;
    	}

    	function onTouchStart(ev) {
    		if (_myId !== -1) return fire("drag:other");
    		let touch = ev.changedTouches[0];
    		let args = makeArgs(touch);
    		_myId = touch.identifier;
    		_start = args.start;
    		_last = args.offset;
    		_skippedMoves = 0;

    		// console.log(`touch start on ${_config.id} (${_myId}) at ${str(_start)}`);
    		fire("drag:start", args);
    	}

    	function onTouchMove(ev) {
    		let touch = ev.changedTouches[0];
    		if (_myId !== touch.identifier) return _skippedMoves++;
    		let args = makeArgs(touch, _start);
    		if (!snapToGrid(args, _last)) return _skippedMoves++;
    		_last = args.offset;
    		fire("drag:move", args);
    	}

    	function onTouchEnd(ev) {
    		return __awaiter$1(this, void 0, void 0, function* () {
    			let touch = ev.changedTouches[0];
    			if (_myId !== touch.identifier) return fire("drag:other");
    			let args = makeArgs(touch, _start);

    			// console.log(`touch end on ${_config.id} (${_myId}) at ${str(args.offset)} moves=${_moves} (skipped ${_skippedMoves})`);
    			_myId = -1;

    			fire("drag:end", args);
    		});
    	}

    	elem.addEventListener("touchstart", onTouchStart, { passive: true });
    	elem.addEventListener("touchmove", onTouchMove, { passive: true });
    	elem.addEventListener("touchend", onTouchEnd, { passive: true });
    	elem.addEventListener("touchcancel", onTouchEnd, { passive: true });

    	return {
    		destroy() {
    			elem.removeEventListener("touchstart", onTouchStart);
    			elem.removeEventListener("touchmove", onTouchMove);
    			elem.removeEventListener("touchend", onTouchEnd);
    			elem.removeEventListener("touchcancel", onTouchEnd);
    		}
    	};
    }

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
    			if (beingDragged(elem)) continue;
    			let pulse = randFrom(pulses);
    			elem.animate(pulse, duration);
    		}
    	});
    }

    function pulse(elem, config) {
    	run(() => startPulsing(elem, config !== null && config !== void 0 ? config : Config));
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

    /* src\core\OnDrag.svelte generated by Svelte v3.38.3 */




    function bounceOnDrag(elem, options) {
    	var _a;

    	options !== null && options !== void 0
    	? options
    	: options = {};

    	(_a = options.snapTo) !== null && _a !== void 0
    	? _a
    	: options.snapTo = [5, 5];

    	function setTranslate(pnt) {
    		elem.style.transform = `translate3d(${pnt.x}px, ${pnt.y}px, 0px)`;
    	}

    	function removeTranslation() {
    		elem.style.transform = null;
    	}

    	function bounceBack(from) {
    		let back = [{ transform: `translate3d(0px, 0px, 0px)` }];

    		elem.animate(back, {
    			duration: 100,
    			easing: "cubic-bezier(.87,.74,.96,1.83)"
    		}).onfinish = () => removeTranslation();
    	}

    	function onDragStart(ev) {
    		
    	}

    	function onDragMove(ev) {
    		setTranslate(ev.detail.offset);
    	}

    	function onDragEnd(ev) {
    		bounceBack(ev.detail.offset);
    	}

    	elem.addEventListener("drag:start", onDragStart);
    	elem.addEventListener("drag:move", onDragMove);
    	elem.addEventListener("drag:end", onDragEnd);
    	let drag = handleDragEvents(elem, options);

    	return {
    		destroy() {
    			drag.destroy();
    			elem.removeEventListener("drag:start", onDragStart);
    			elem.removeEventListener("drag:move", onDragMove);
    			elem.removeEventListener("drag:end", onDragEnd);
    		}
    	};
    }

    function soundsOnDrag(elem, map) {
    	map !== null && map !== void 0 ? map : map = new Map();

    	function onDragStart(ev) {
    		Mp3.play(map.get("drag:start"));
    	}

    	function onDragEnd(ev) {
    		Mp3.play(map.get("drag:end"));
    	}

    	elem.addEventListener("drag:start", onDragStart);
    	elem.addEventListener("drag:end", onDragEnd);
    	let drag = handleDragEvents(elem);

    	return {
    		destroy() {
    			drag.destroy();
    			elem.removeEventListener("drag:start", onDragStart);
    			elem.removeEventListener("drag:end", onDragEnd);
    		}
    	};
    }

    /* src\core\Clock.svelte generated by Svelte v3.38.3 */
    const file$j = "src\\core\\Clock.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (50:2) {#each [1, 2, 3, 4] as offset}
    function create_each_block_1(ctx) {
    	let line;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			attr_dev(line, "class", "minor svelte-drk22q");
    			attr_dev(line, "y1", "42");
    			attr_dev(line, "y2", "45");
    			attr_dev(line, "transform", "rotate(" + 6 * (/*minute*/ ctx[7] + /*offset*/ ctx[10]) + ")");
    			add_location(line, file$j, 50, 3, 1149);
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
    		source: "(50:2) {#each [1, 2, 3, 4] as offset}",
    		ctx
    	});

    	return block;
    }

    // (42:1) {#each [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as minute}
    function create_each_block$4(ctx) {
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
    			add_location(line, file$j, 42, 2, 1017);
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
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(42:1) {#each [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as minute}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$n(ctx) {
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
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
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
    			add_location(circle, file$j, 38, 1, 846);
    			attr_dev(line0, "class", "hour svelte-drk22q");
    			attr_dev(line0, "y1", "2");
    			attr_dev(line0, "y2", "-20");
    			attr_dev(line0, "transform", line0_transform_value = "rotate(" + (30 * /*hours*/ ctx[2] + /*minutes*/ ctx[3] / 2) + ")");
    			add_location(line0, file$j, 60, 1, 1302);
    			attr_dev(line1, "class", "minute svelte-drk22q");
    			attr_dev(line1, "y1", "4");
    			attr_dev(line1, "y2", "-30");
    			attr_dev(line1, "transform", line1_transform_value = "rotate(" + (6 * /*minutes*/ ctx[3] + /*seconds*/ ctx[4] / 10) + ")");
    			add_location(line1, file$j, 68, 1, 1428);
    			attr_dev(line2, "class", "second svelte-drk22q");
    			attr_dev(line2, "y1", "10");
    			attr_dev(line2, "y2", "-38");
    			add_location(line2, file$j, 77, 2, 1599);
    			attr_dev(line3, "class", "second-counterweight svelte-drk22q");
    			attr_dev(line3, "y1", "10");
    			attr_dev(line3, "y2", "2");
    			add_location(line3, file$j, 78, 2, 1642);
    			attr_dev(g, "transform", g_transform_value = "rotate(" + 6 * /*seconds*/ ctx[4] + ")");
    			add_location(g, file$j, 76, 1, 1558);
    			attr_dev(svg, "viewBox", "-50 -50 100 100");
    			set_style(svg, "grid-area", /*ga*/ ctx[0]);
    			attr_dev(svg, "class", "svelte-drk22q");
    			add_location(svg, file$j, 33, 0, 722);
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
    					action_destroyer(pulse.call(null, svg)),
    					action_destroyer(bounceOnDrag.call(null, svg))
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
    		id: create_fragment$n.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$n($$self, $$props, $$invalidate) {
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
    		bounceOnDrag,
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
    		init(this, options, instance$n, create_fragment$n, safe_not_equal, { ga: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Clock",
    			options,
    			id: create_fragment$n.name
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
    const file$i = "src\\core\\Congrats.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	child_ctx[8] = list;
    	child_ctx[9] = i;
    	return child_ctx;
    }

    // (61:4) {#each stars as star}
    function create_each_block$3(ctx) {
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
    			add_location(polygon, file$i, 71, 16, 1915);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			add_location(svg, file$i, 69, 12, 1817);
    			attr_dev(div, "class", "box svelte-1nasn8");
    			set_style(div, "--size", /*config*/ ctx[2].size + "px");
    			set_style(div, "--left", /*config*/ ctx[2].pos[0] + "px");
    			set_style(div, "--top", /*config*/ ctx[2].pos[1] + "px");
    			add_location(div, file$i, 61, 8, 1577);
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
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(61:4) {#each stars as star}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$m(ctx) {
    	let div;
    	let each_value = /*stars*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "svelte-1nasn8");
    			toggle_class(div, "hidden", /*hidden*/ ctx[1]);
    			add_location(div, file$i, 59, 0, 1522);
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
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
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
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, { play: 3, noOfStars: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Congrats",
    			options,
    			id: create_fragment$m.name
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

    /* src\plus-over\Model.svelte generated by Svelte v3.38.3 */



    function on$3(name, cb) {
    	onAny(name, cb);
    }

    function fire$2(name, args) {
    	fireAny(name, args);
    }

    function newTimedCmd$2(cmd, timeout, jitter) {
    	return new CTimedCmd(cmd, timeout, jitter !== null && jitter !== void 0 ? jitter : 0);
    }

    /* src\plus-over\PlusOver.svelte generated by Svelte v3.38.3 */


    let _game$1;
    let _tcNewRound = newTimedCmd$2("--cmd-new-round", 1000);
    let _tcIdle = newTimedCmd$2("--cmd-idle", 10000, 3000);
    let _playbook = [];
    let _roundNo = -1;
    let _m = [1, 8];

    function getPair() {
    	let nums = Anki.tokens();
    	let pairs = [];

    	for (let i = 0; i < nums.length - 1; i += 2) {
    		pairs.push([parseInt(nums[i]), parseInt(nums[i + 1])]);
    	}

    	let pair = randFrom(pairs);
    	return pair;
    }

    function splitToLines(numsInLine) {
    	let lines = [];
    	let line = [];

    	for (let token of Anki.tokens()) {
    		let num = parseInt(token);
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
    	let a1 = rand(_m[0], _m[1]);
    	let a = 10 * a1 + a0;
    	let b0 = pair[1];
    	let b1 = rand(_m[0], _m[1] + 1 - a1);
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
    	let a1 = rand(_m[0], _m[1] + 1);
    	let a = 10 * a1 + a0;
    	let b1 = rand(_m[0], _m[1] + 1 - a1);
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
    	constructor() {
    		for (let cmd of Anki.commands()) {
    			switch (cmd[0].toLocaleLowerCase()) {
    				case "m":
    					_m = cmd.slice(1).map(x => parseInt(x));
    					break;
    			}
    		}
    	}

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
    const file$h = "src\\plus-over\\Count.svelte";

    function create_fragment$l(ctx) {
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
    			add_location(button, file$h, 15, 0, 424);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(pulse.call(null, button)),
    					action_destroyer(bounceOnDrag.call(null, button))
    				];

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
    			run_all(dispose);
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
    	validate_slots("Count", slots, []);
    	
    	let _count;
    	let { ga } = $$props;
    	let { sz = "30px" } = $$props;

    	function updateView(game) {
    		$$invalidate(2, _count = game.roundsLeft.toString());
    	}

    	on$3("--cmd-update-views", updateView);
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
    		bounceOnDrag,
    		on: on$3,
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
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, { ga: 0, sz: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Count",
    			options,
    			id: create_fragment$l.name
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
    const file$g = "src\\plus-over\\Num.svelte";

    function create_fragment$k(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_num*/ ctx[1]);
    			attr_dev(button, "class", /*_bgColor*/ ctx[3]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*_sz*/ ctx[2] + "px");
    			add_location(button, file$g, 23, 0, 623);
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
    					action_destroyer(pulse.call(null, button)),
    					action_destroyer(bounceOnDrag.call(null, button)),
    					action_destroyer(soundsOnDrag.call(null, button, new Map([["drag:start", "yes"], ["drag:end", "no"]])))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_num*/ 2) set_data_dev(t, /*_num*/ ctx[1]);

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
    			run_all(dispose);
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
    	validate_slots("Num", slots, []);
    	
    	let { ga } = $$props;
    	let { index } = $$props;
    	let { sz = 30 } = $$props;
    	let _num;
    	let _bgColor = getBgColor(ga);
    	let _scale;
    	let _sz;

    	function onClick() {
    		fire$2("--evt-click");
    	}

    	function updateView(game) {
    		$$invalidate(1, _num = game.nums[index].toLocaleString("en"));
    		_scale = _num.length <= 3 ? 1.2 : 2;
    		$$invalidate(2, _sz = sz - _scale * _num.length);
    	}

    	on$3("--cmd-update-views", updateView);
    	const writable_props = ["ga", "index", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Num> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("index" in $$props) $$invalidate(5, index = $$props.index);
    		if ("sz" in $$props) $$invalidate(6, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		getBgColor,
    		bounceOnDrag,
    		soundsOnDrag,
    		on: on$3,
    		fire: fire$2,
    		ga,
    		index,
    		sz,
    		_num,
    		_bgColor,
    		_scale,
    		_sz,
    		onClick,
    		updateView
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("index" in $$props) $$invalidate(5, index = $$props.index);
    		if ("sz" in $$props) $$invalidate(6, sz = $$props.sz);
    		if ("_num" in $$props) $$invalidate(1, _num = $$props._num);
    		if ("_bgColor" in $$props) $$invalidate(3, _bgColor = $$props._bgColor);
    		if ("_scale" in $$props) _scale = $$props._scale;
    		if ("_sz" in $$props) $$invalidate(2, _sz = $$props._sz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, _num, _sz, _bgColor, onClick, index, sz];
    }

    class Num$2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, { ga: 0, index: 5, sz: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Num",
    			options,
    			id: create_fragment$k.name
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
    const file$f = "src\\plus-over\\Op.svelte";

    function create_fragment$j(ctx) {
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
    			add_location(button, file$f, 16, 0, 450);
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
    					action_destroyer(pulse.call(null, button)),
    					action_destroyer(bounceOnDrag.call(null, button))
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
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Op", slots, []);
    	
    	let { ga } = $$props;
    	let { sz = "30px" } = $$props;
    	let _op = "+";
    	let _bgColor = getBgColor(ga);

    	function updateView(game) {
    		$$invalidate(2, _op = game.op);
    	}

    	on$3("--cmd-update-views", updateView);
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
    		bounceOnDrag,
    		on: on$3,
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
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, { ga: 0, sz: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Op",
    			options,
    			id: create_fragment$j.name
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
    const file$e = "src\\plus-over\\Ans.svelte";

    function create_fragment$i(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_text*/ ctx[1]);
    			attr_dev(button, "class", /*_class*/ ctx[2]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*_sz*/ ctx[3] + "px");
    			add_location(button, file$e, 39, 0, 1029);
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
    					action_destroyer(pulse.call(null, button)),
    					action_destroyer(bounceOnDrag.call(null, button))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_text*/ 2) set_data_dev(t, /*_text*/ ctx[1]);

    			if (dirty & /*_class*/ 4) {
    				attr_dev(button, "class", /*_class*/ ctx[2]);
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
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Ans", slots, []);
    	
    	let _text;
    	let _class;
    	let _scale;
    	let _sz;
    	let { ga } = $$props;
    	let { index } = $$props;
    	let { sz = 30 } = $$props;

    	function onClick() {
    		fire$2("--evt-answer", { index });
    	}

    	function getText(game) {
    		if (game.state === "first-click") return "??";
    		return game.answers[index].toLocaleString("en");
    	}

    	function getClass(game) {
    		if (game.state === "first-click") return "bg-gray-100";
    		if (game.state === "active") return "bg-orange-200";
    		if (game.rightAt === index) return "bg-green-200";
    		if (game.clickedAt !== index) return "bg-gray-100";
    		return "bg-red-200";
    	}

    	function updateView(game) {
    		$$invalidate(1, _text = getText(game));
    		$$invalidate(2, _class = getClass(game));
    		_scale = _text.length <= 3 ? 1.2 : 2;
    		$$invalidate(3, _sz = sz - _scale * _text.length);
    	}

    	on$3("--cmd-update-views", updateView);
    	const writable_props = ["ga", "index", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Ans> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("index" in $$props) $$invalidate(5, index = $$props.index);
    		if ("sz" in $$props) $$invalidate(6, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		bounceOnDrag,
    		on: on$3,
    		fire: fire$2,
    		_text,
    		_class,
    		_scale,
    		_sz,
    		ga,
    		index,
    		sz,
    		onClick,
    		getText,
    		getClass,
    		updateView
    	});

    	$$self.$inject_state = $$props => {
    		if ("_text" in $$props) $$invalidate(1, _text = $$props._text);
    		if ("_class" in $$props) $$invalidate(2, _class = $$props._class);
    		if ("_scale" in $$props) _scale = $$props._scale;
    		if ("_sz" in $$props) $$invalidate(3, _sz = $$props._sz);
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("index" in $$props) $$invalidate(5, index = $$props.index);
    		if ("sz" in $$props) $$invalidate(6, sz = $$props.sz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, _text, _class, _sz, onClick, index, sz];
    }

    class Ans$2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, { ga: 0, index: 5, sz: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ans",
    			options,
    			id: create_fragment$i.name
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
    const file$d = "src\\plus-over\\Pair.svelte";

    function create_fragment$h(ctx) {
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
    			add_location(button0, file$d, 18, 4, 562);
    			attr_dev(button1, "class", /*_bgColor*/ ctx[4]);
    			add_location(button1, file$d, 25, 4, 681);
    			set_style(div, "grid-area", /*ga*/ ctx[0]);
    			set_style(div, "font-size", /*sz*/ ctx[1]);
    			add_location(div, file$d, 17, 0, 513);
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
    					action_destroyer(bounceOnDrag.call(null, button0)),
    					action_destroyer(pulse.call(null, button1)),
    					action_destroyer(bounceOnDrag.call(null, button1))
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
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
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

    	on$3("--cmd-update-views", updateView);
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
    		bounceOnDrag,
    		on: on$3,
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
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, { ga: 0, sz: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Pair",
    			options,
    			id: create_fragment$h.name
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
    const file$c = "src\\plus-over\\Digit.svelte";

    function create_fragment$g(ctx) {
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
    			add_location(button, file$c, 17, 4, 502);
    			set_style(div, "grid-area", /*ga*/ ctx[0]);
    			set_style(div, "font-size", /*sz*/ ctx[1]);
    			add_location(div, file$c, 16, 0, 453);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(pulse.call(null, button)),
    					action_destroyer(bounceOnDrag.call(null, button))
    				];

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
    	validate_slots("Digit", slots, []);
    	
    	let { ga } = $$props;
    	let { sz = "15px" } = $$props;
    	let _digit;
    	let _bgColor = getBgColor(ga);

    	function updateView(game) {
    		$$invalidate(2, _digit = game.showHint ? game.sumDigit.toString() : "?");
    	}

    	on$3("--cmd-update-views", updateView);
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
    		bounceOnDrag,
    		on: on$3,
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
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, { ga: 0, sz: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Digit",
    			options,
    			id: create_fragment$g.name
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
    function create_default_slot$4(ctx) {
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

    	ans0 = new Ans$2({
    			props: { ga: "a1", index: 0 },
    			$$inline: true
    		});

    	ans1 = new Ans$2({
    			props: { ga: "a2", index: 1 },
    			$$inline: true
    		});

    	ans2 = new Ans$2({
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
    		id: create_default_slot$4.name,
    		type: "slot",
    		source: "(45:0) <Grid {layout}      on:click={() => fire(\\\"--evt-click\\\")}  >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$f(ctx) {
    	let grid;
    	let current;

    	grid = new Grid({
    			props: {
    				layout: /*layout*/ ctx[1],
    				$$slots: { default: [create_default_slot$4] },
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
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Main", slots, []);
    	let congrats;

    	function done() {
    		congrats.play();
    		PlusOver.done();
    	}

    	on$3("--cmd-new-round", () => PlusOver.newRound());
    	on$3("--evt-answer", args => PlusOver.gotAnswer(args));
    	on$3("--evt-click", () => PlusOver.gotClicked());
    	on$3("--evt-done", () => done());
    	on$3("--evt-yes", () => PlusOver.yes());
    	on$3("--evt-no", () => PlusOver.no());
    	on$3("--cmd-idle", () => PlusOver.idle());
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
    		on: on$3,
    		fire: fire$2,
    		Count: Count$2,
    		Num: Num$2,
    		Op: Op$1,
    		Ans: Ans$2,
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

    class Main$3 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Main",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src\gcd-lcm\Model.svelte generated by Svelte v3.38.3 */



    function on$2(name, cb) {
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
    const file$b = "src\\gcd-lcm\\Go.svelte";

    function create_fragment$e(ctx) {
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
    			add_location(button, file$b, 15, 0, 452);
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
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { ga: 0, sz: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Go",
    			options,
    			id: create_fragment$e.name
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
    const file$a = "src\\gcd-lcm\\Num.svelte";

    function create_fragment$d(ctx) {
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
    			add_location(button, file$a, 12, 0, 272);
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
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { ga: 0, sz: 1, setModel: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Num",
    			options,
    			id: create_fragment$d.name
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
    const file$9 = "src\\gcd-lcm\\Factor.svelte";

    function create_fragment$c(ctx) {
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
    			add_location(button, file$9, 33, 0, 698);
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
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
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

    	on$2("--cmd-update-views", () => update());
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
    		on: on$2,
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
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { ga: 0, sz: 1, update: 7, setModel: 8 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Factor",
    			options,
    			id: create_fragment$c.name
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
    const file$8 = "src\\gcd-lcm\\Count.svelte";

    function create_fragment$b(ctx) {
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
    			add_location(button, file$8, 11, 0, 278);
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
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { ga: 0, sz: 1, setModel: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Count",
    			options,
    			id: create_fragment$b.name
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

    function get_each_context$2(ctx, list, i) {
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
    function create_each_block$2(ctx) {
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
    		id: create_each_block$2.name,
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
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
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
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
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
    function create_default_slot$3(ctx) {
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
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(95:0) <Grid {layout}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let grid;
    	let current;

    	grid = new Grid({
    			props: {
    				layout: /*layout*/ ctx[2],
    				$$slots: { default: [create_default_slot$3] },
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
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Main", slots, []);
    	let congrats;

    	function done() {
    		congrats.play();
    		GcdLcm.done();
    	}

    	on$2("--cmd-new-round", () => GcdLcm.newRound());
    	on$2("--evt-done", () => done());
    	on$2("--cmd-idle", () => GcdLcm.idle());
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

    	on$2("--evt-go", () => {
    		randFrom(GcdLcm.game.divisors).wrong = true;
    		fire$1("--cmd-update-views");
    	});

    	on$2("--cmd-set-models", game => {
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
    		on: on$2,
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

    class Main$2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Main",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    var decimal = createCommonjsModule(function (module) {
    (function (globalScope) {


      /*
       *  decimal.js v10.3.1
       *  An arbitrary-precision Decimal type for JavaScript.
       *  https://github.com/MikeMcl/decimal.js
       *  Copyright (c) 2021 Michael Mclaughlin <M8ch88l@gmail.com>
       *  MIT Licence
       */


      // -----------------------------------  EDITABLE DEFAULTS  ------------------------------------ //


        // The maximum exponent magnitude.
        // The limit on the value of `toExpNeg`, `toExpPos`, `minE` and `maxE`.
      var EXP_LIMIT = 9e15,                      // 0 to 9e15

        // The limit on the value of `precision`, and on the value of the first argument to
        // `toDecimalPlaces`, `toExponential`, `toFixed`, `toPrecision` and `toSignificantDigits`.
        MAX_DIGITS = 1e9,                        // 0 to 1e9

        // Base conversion alphabet.
        NUMERALS = '0123456789abcdef',

        // The natural logarithm of 10 (1025 digits).
        LN10 = '2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053089653777326288461633662222876982198867465436674744042432743651550489343149393914796194044002221051017141748003688084012647080685567743216228355220114804663715659121373450747856947683463616792101806445070648000277502684916746550586856935673420670581136429224554405758925724208241314695689016758940256776311356919292033376587141660230105703089634572075440370847469940168269282808481184289314848524948644871927809676271275775397027668605952496716674183485704422507197965004714951050492214776567636938662976979522110718264549734772662425709429322582798502585509785265383207606726317164309505995087807523710333101197857547331541421808427543863591778117054309827482385045648019095610299291824318237525357709750539565187697510374970888692180205189339507238539205144634197265287286965110862571492198849978748873771345686209167058',

        // Pi (1025 digits).
        PI = '3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632789',


        // The initial configuration properties of the Decimal constructor.
        DEFAULTS = {

          // These values must be integers within the stated ranges (inclusive).
          // Most of these values can be changed at run-time using the `Decimal.config` method.

          // The maximum number of significant digits of the result of a calculation or base conversion.
          // E.g. `Decimal.config({ precision: 20 });`
          precision: 20,                         // 1 to MAX_DIGITS

          // The rounding mode used when rounding to `precision`.
          //
          // ROUND_UP         0 Away from zero.
          // ROUND_DOWN       1 Towards zero.
          // ROUND_CEIL       2 Towards +Infinity.
          // ROUND_FLOOR      3 Towards -Infinity.
          // ROUND_HALF_UP    4 Towards nearest neighbour. If equidistant, up.
          // ROUND_HALF_DOWN  5 Towards nearest neighbour. If equidistant, down.
          // ROUND_HALF_EVEN  6 Towards nearest neighbour. If equidistant, towards even neighbour.
          // ROUND_HALF_CEIL  7 Towards nearest neighbour. If equidistant, towards +Infinity.
          // ROUND_HALF_FLOOR 8 Towards nearest neighbour. If equidistant, towards -Infinity.
          //
          // E.g.
          // `Decimal.rounding = 4;`
          // `Decimal.rounding = Decimal.ROUND_HALF_UP;`
          rounding: 4,                           // 0 to 8

          // The modulo mode used when calculating the modulus: a mod n.
          // The quotient (q = a / n) is calculated according to the corresponding rounding mode.
          // The remainder (r) is calculated as: r = a - n * q.
          //
          // UP         0 The remainder is positive if the dividend is negative, else is negative.
          // DOWN       1 The remainder has the same sign as the dividend (JavaScript %).
          // FLOOR      3 The remainder has the same sign as the divisor (Python %).
          // HALF_EVEN  6 The IEEE 754 remainder function.
          // EUCLID     9 Euclidian division. q = sign(n) * floor(a / abs(n)). Always positive.
          //
          // Truncated division (1), floored division (3), the IEEE 754 remainder (6), and Euclidian
          // division (9) are commonly used for the modulus operation. The other rounding modes can also
          // be used, but they may not give useful results.
          modulo: 1,                             // 0 to 9

          // The exponent value at and beneath which `toString` returns exponential notation.
          // JavaScript numbers: -7
          toExpNeg: -7,                          // 0 to -EXP_LIMIT

          // The exponent value at and above which `toString` returns exponential notation.
          // JavaScript numbers: 21
          toExpPos:  21,                         // 0 to EXP_LIMIT

          // The minimum exponent value, beneath which underflow to zero occurs.
          // JavaScript numbers: -324  (5e-324)
          minE: -EXP_LIMIT,                      // -1 to -EXP_LIMIT

          // The maximum exponent value, above which overflow to Infinity occurs.
          // JavaScript numbers: 308  (1.7976931348623157e+308)
          maxE: EXP_LIMIT,                       // 1 to EXP_LIMIT

          // Whether to use cryptographically-secure random number generation, if available.
          crypto: false                          // true/false
        },


      // ----------------------------------- END OF EDITABLE DEFAULTS ------------------------------- //


        Decimal, inexact, noConflict, quadrant,
        external = true,

        decimalError = '[DecimalError] ',
        invalidArgument = decimalError + 'Invalid argument: ',
        precisionLimitExceeded = decimalError + 'Precision limit exceeded',
        cryptoUnavailable = decimalError + 'crypto unavailable',
        tag = '[object Decimal]',

        mathfloor = Math.floor,
        mathpow = Math.pow,

        isBinary = /^0b([01]+(\.[01]*)?|\.[01]+)(p[+-]?\d+)?$/i,
        isHex = /^0x([0-9a-f]+(\.[0-9a-f]*)?|\.[0-9a-f]+)(p[+-]?\d+)?$/i,
        isOctal = /^0o([0-7]+(\.[0-7]*)?|\.[0-7]+)(p[+-]?\d+)?$/i,
        isDecimal = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i,

        BASE = 1e7,
        LOG_BASE = 7,
        MAX_SAFE_INTEGER = 9007199254740991,

        LN10_PRECISION = LN10.length - 1,
        PI_PRECISION = PI.length - 1,

        // Decimal.prototype object
        P = { toStringTag: tag };


      // Decimal prototype methods


      /*
       *  absoluteValue             abs
       *  ceil
       *  clampedTo                 clamp
       *  comparedTo                cmp
       *  cosine                    cos
       *  cubeRoot                  cbrt
       *  decimalPlaces             dp
       *  dividedBy                 div
       *  dividedToIntegerBy        divToInt
       *  equals                    eq
       *  floor
       *  greaterThan               gt
       *  greaterThanOrEqualTo      gte
       *  hyperbolicCosine          cosh
       *  hyperbolicSine            sinh
       *  hyperbolicTangent         tanh
       *  inverseCosine             acos
       *  inverseHyperbolicCosine   acosh
       *  inverseHyperbolicSine     asinh
       *  inverseHyperbolicTangent  atanh
       *  inverseSine               asin
       *  inverseTangent            atan
       *  isFinite
       *  isInteger                 isInt
       *  isNaN
       *  isNegative                isNeg
       *  isPositive                isPos
       *  isZero
       *  lessThan                  lt
       *  lessThanOrEqualTo         lte
       *  logarithm                 log
       *  [maximum]                 [max]
       *  [minimum]                 [min]
       *  minus                     sub
       *  modulo                    mod
       *  naturalExponential        exp
       *  naturalLogarithm          ln
       *  negated                   neg
       *  plus                      add
       *  precision                 sd
       *  round
       *  sine                      sin
       *  squareRoot                sqrt
       *  tangent                   tan
       *  times                     mul
       *  toBinary
       *  toDecimalPlaces           toDP
       *  toExponential
       *  toFixed
       *  toFraction
       *  toHexadecimal             toHex
       *  toNearest
       *  toNumber
       *  toOctal
       *  toPower                   pow
       *  toPrecision
       *  toSignificantDigits       toSD
       *  toString
       *  truncated                 trunc
       *  valueOf                   toJSON
       */


      /*
       * Return a new Decimal whose value is the absolute value of this Decimal.
       *
       */
      P.absoluteValue = P.abs = function () {
        var x = new this.constructor(this);
        if (x.s < 0) x.s = 1;
        return finalise(x);
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal rounded to a whole number in the
       * direction of positive Infinity.
       *
       */
      P.ceil = function () {
        return finalise(new this.constructor(this), this.e + 1, 2);
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal clamped to the range
       * delineated by `min` and `max`.
       *
       * min {number|string|Decimal}
       * max {number|string|Decimal}
       *
       */
      P.clampedTo = P.clamp = function (min, max) {
        var k,
          x = this,
          Ctor = x.constructor;
        min = new Ctor(min);
        max = new Ctor(max);
        if (!min.s || !max.s) return new Ctor(NaN);
        if (min.gt(max)) throw Error(invalidArgument + max);
        k = x.cmp(min);
        return k < 0 ? min : x.cmp(max) > 0 ? max : new Ctor(x);
      };


      /*
       * Return
       *   1    if the value of this Decimal is greater than the value of `y`,
       *  -1    if the value of this Decimal is less than the value of `y`,
       *   0    if they have the same value,
       *   NaN  if the value of either Decimal is NaN.
       *
       */
      P.comparedTo = P.cmp = function (y) {
        var i, j, xdL, ydL,
          x = this,
          xd = x.d,
          yd = (y = new x.constructor(y)).d,
          xs = x.s,
          ys = y.s;

        // Either NaN or ±Infinity?
        if (!xd || !yd) {
          return !xs || !ys ? NaN : xs !== ys ? xs : xd === yd ? 0 : !xd ^ xs < 0 ? 1 : -1;
        }

        // Either zero?
        if (!xd[0] || !yd[0]) return xd[0] ? xs : yd[0] ? -ys : 0;

        // Signs differ?
        if (xs !== ys) return xs;

        // Compare exponents.
        if (x.e !== y.e) return x.e > y.e ^ xs < 0 ? 1 : -1;

        xdL = xd.length;
        ydL = yd.length;

        // Compare digit by digit.
        for (i = 0, j = xdL < ydL ? xdL : ydL; i < j; ++i) {
          if (xd[i] !== yd[i]) return xd[i] > yd[i] ^ xs < 0 ? 1 : -1;
        }

        // Compare lengths.
        return xdL === ydL ? 0 : xdL > ydL ^ xs < 0 ? 1 : -1;
      };


      /*
       * Return a new Decimal whose value is the cosine of the value in radians of this Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-1, 1]
       *
       * cos(0)         = 1
       * cos(-0)        = 1
       * cos(Infinity)  = NaN
       * cos(-Infinity) = NaN
       * cos(NaN)       = NaN
       *
       */
      P.cosine = P.cos = function () {
        var pr, rm,
          x = this,
          Ctor = x.constructor;

        if (!x.d) return new Ctor(NaN);

        // cos(0) = cos(-0) = 1
        if (!x.d[0]) return new Ctor(1);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + Math.max(x.e, x.sd()) + LOG_BASE;
        Ctor.rounding = 1;

        x = cosine(Ctor, toLessThanHalfPi(Ctor, x));

        Ctor.precision = pr;
        Ctor.rounding = rm;

        return finalise(quadrant == 2 || quadrant == 3 ? x.neg() : x, pr, rm, true);
      };


      /*
       *
       * Return a new Decimal whose value is the cube root of the value of this Decimal, rounded to
       * `precision` significant digits using rounding mode `rounding`.
       *
       *  cbrt(0)  =  0
       *  cbrt(-0) = -0
       *  cbrt(1)  =  1
       *  cbrt(-1) = -1
       *  cbrt(N)  =  N
       *  cbrt(-I) = -I
       *  cbrt(I)  =  I
       *
       * Math.cbrt(x) = (x < 0 ? -Math.pow(-x, 1/3) : Math.pow(x, 1/3))
       *
       */
      P.cubeRoot = P.cbrt = function () {
        var e, m, n, r, rep, s, sd, t, t3, t3plusx,
          x = this,
          Ctor = x.constructor;

        if (!x.isFinite() || x.isZero()) return new Ctor(x);
        external = false;

        // Initial estimate.
        s = x.s * mathpow(x.s * x, 1 / 3);

         // Math.cbrt underflow/overflow?
         // Pass x to Math.pow as integer, then adjust the exponent of the result.
        if (!s || Math.abs(s) == 1 / 0) {
          n = digitsToString(x.d);
          e = x.e;

          // Adjust n exponent so it is a multiple of 3 away from x exponent.
          if (s = (e - n.length + 1) % 3) n += (s == 1 || s == -2 ? '0' : '00');
          s = mathpow(n, 1 / 3);

          // Rarely, e may be one less than the result exponent value.
          e = mathfloor((e + 1) / 3) - (e % 3 == (e < 0 ? -1 : 2));

          if (s == 1 / 0) {
            n = '5e' + e;
          } else {
            n = s.toExponential();
            n = n.slice(0, n.indexOf('e') + 1) + e;
          }

          r = new Ctor(n);
          r.s = x.s;
        } else {
          r = new Ctor(s.toString());
        }

        sd = (e = Ctor.precision) + 3;

        // Halley's method.
        // TODO? Compare Newton's method.
        for (;;) {
          t = r;
          t3 = t.times(t).times(t);
          t3plusx = t3.plus(x);
          r = divide(t3plusx.plus(x).times(t), t3plusx.plus(t3), sd + 2, 1);

          // TODO? Replace with for-loop and checkRoundingDigits.
          if (digitsToString(t.d).slice(0, sd) === (n = digitsToString(r.d)).slice(0, sd)) {
            n = n.slice(sd - 3, sd + 1);

            // The 4th rounding digit may be in error by -1 so if the 4 rounding digits are 9999 or 4999
            // , i.e. approaching a rounding boundary, continue the iteration.
            if (n == '9999' || !rep && n == '4999') {

              // On the first iteration only, check to see if rounding up gives the exact result as the
              // nines may infinitely repeat.
              if (!rep) {
                finalise(t, e + 1, 0);

                if (t.times(t).times(t).eq(x)) {
                  r = t;
                  break;
                }
              }

              sd += 4;
              rep = 1;
            } else {

              // If the rounding digits are null, 0{0,4} or 50{0,3}, check for an exact result.
              // If not, then there are further digits and m will be truthy.
              if (!+n || !+n.slice(1) && n.charAt(0) == '5') {

                // Truncate to the first rounding digit.
                finalise(r, e + 1, 1);
                m = !r.times(r).times(r).eq(x);
              }

              break;
            }
          }
        }

        external = true;

        return finalise(r, e, Ctor.rounding, m);
      };


      /*
       * Return the number of decimal places of the value of this Decimal.
       *
       */
      P.decimalPlaces = P.dp = function () {
        var w,
          d = this.d,
          n = NaN;

        if (d) {
          w = d.length - 1;
          n = (w - mathfloor(this.e / LOG_BASE)) * LOG_BASE;

          // Subtract the number of trailing zeros of the last word.
          w = d[w];
          if (w) for (; w % 10 == 0; w /= 10) n--;
          if (n < 0) n = 0;
        }

        return n;
      };


      /*
       *  n / 0 = I
       *  n / N = N
       *  n / I = 0
       *  0 / n = 0
       *  0 / 0 = N
       *  0 / N = N
       *  0 / I = 0
       *  N / n = N
       *  N / 0 = N
       *  N / N = N
       *  N / I = N
       *  I / n = I
       *  I / 0 = I
       *  I / N = N
       *  I / I = N
       *
       * Return a new Decimal whose value is the value of this Decimal divided by `y`, rounded to
       * `precision` significant digits using rounding mode `rounding`.
       *
       */
      P.dividedBy = P.div = function (y) {
        return divide(this, new this.constructor(y));
      };


      /*
       * Return a new Decimal whose value is the integer part of dividing the value of this Decimal
       * by the value of `y`, rounded to `precision` significant digits using rounding mode `rounding`.
       *
       */
      P.dividedToIntegerBy = P.divToInt = function (y) {
        var x = this,
          Ctor = x.constructor;
        return finalise(divide(x, new Ctor(y), 0, 1, 1), Ctor.precision, Ctor.rounding);
      };


      /*
       * Return true if the value of this Decimal is equal to the value of `y`, otherwise return false.
       *
       */
      P.equals = P.eq = function (y) {
        return this.cmp(y) === 0;
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal rounded to a whole number in the
       * direction of negative Infinity.
       *
       */
      P.floor = function () {
        return finalise(new this.constructor(this), this.e + 1, 3);
      };


      /*
       * Return true if the value of this Decimal is greater than the value of `y`, otherwise return
       * false.
       *
       */
      P.greaterThan = P.gt = function (y) {
        return this.cmp(y) > 0;
      };


      /*
       * Return true if the value of this Decimal is greater than or equal to the value of `y`,
       * otherwise return false.
       *
       */
      P.greaterThanOrEqualTo = P.gte = function (y) {
        var k = this.cmp(y);
        return k == 1 || k === 0;
      };


      /*
       * Return a new Decimal whose value is the hyperbolic cosine of the value in radians of this
       * Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [1, Infinity]
       *
       * cosh(x) = 1 + x^2/2! + x^4/4! + x^6/6! + ...
       *
       * cosh(0)         = 1
       * cosh(-0)        = 1
       * cosh(Infinity)  = Infinity
       * cosh(-Infinity) = Infinity
       * cosh(NaN)       = NaN
       *
       *  x        time taken (ms)   result
       * 1000      9                 9.8503555700852349694e+433
       * 10000     25                4.4034091128314607936e+4342
       * 100000    171               1.4033316802130615897e+43429
       * 1000000   3817              1.5166076984010437725e+434294
       * 10000000  abandoned after 2 minute wait
       *
       * TODO? Compare performance of cosh(x) = 0.5 * (exp(x) + exp(-x))
       *
       */
      P.hyperbolicCosine = P.cosh = function () {
        var k, n, pr, rm, len,
          x = this,
          Ctor = x.constructor,
          one = new Ctor(1);

        if (!x.isFinite()) return new Ctor(x.s ? 1 / 0 : NaN);
        if (x.isZero()) return one;

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + Math.max(x.e, x.sd()) + 4;
        Ctor.rounding = 1;
        len = x.d.length;

        // Argument reduction: cos(4x) = 1 - 8cos^2(x) + 8cos^4(x) + 1
        // i.e. cos(x) = 1 - cos^2(x/4)(8 - 8cos^2(x/4))

        // Estimate the optimum number of times to use the argument reduction.
        // TODO? Estimation reused from cosine() and may not be optimal here.
        if (len < 32) {
          k = Math.ceil(len / 3);
          n = (1 / tinyPow(4, k)).toString();
        } else {
          k = 16;
          n = '2.3283064365386962890625e-10';
        }

        x = taylorSeries(Ctor, 1, x.times(n), new Ctor(1), true);

        // Reverse argument reduction
        var cosh2_x,
          i = k,
          d8 = new Ctor(8);
        for (; i--;) {
          cosh2_x = x.times(x);
          x = one.minus(cosh2_x.times(d8.minus(cosh2_x.times(d8))));
        }

        return finalise(x, Ctor.precision = pr, Ctor.rounding = rm, true);
      };


      /*
       * Return a new Decimal whose value is the hyperbolic sine of the value in radians of this
       * Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-Infinity, Infinity]
       *
       * sinh(x) = x + x^3/3! + x^5/5! + x^7/7! + ...
       *
       * sinh(0)         = 0
       * sinh(-0)        = -0
       * sinh(Infinity)  = Infinity
       * sinh(-Infinity) = -Infinity
       * sinh(NaN)       = NaN
       *
       * x        time taken (ms)
       * 10       2 ms
       * 100      5 ms
       * 1000     14 ms
       * 10000    82 ms
       * 100000   886 ms            1.4033316802130615897e+43429
       * 200000   2613 ms
       * 300000   5407 ms
       * 400000   8824 ms
       * 500000   13026 ms          8.7080643612718084129e+217146
       * 1000000  48543 ms
       *
       * TODO? Compare performance of sinh(x) = 0.5 * (exp(x) - exp(-x))
       *
       */
      P.hyperbolicSine = P.sinh = function () {
        var k, pr, rm, len,
          x = this,
          Ctor = x.constructor;

        if (!x.isFinite() || x.isZero()) return new Ctor(x);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + Math.max(x.e, x.sd()) + 4;
        Ctor.rounding = 1;
        len = x.d.length;

        if (len < 3) {
          x = taylorSeries(Ctor, 2, x, x, true);
        } else {

          // Alternative argument reduction: sinh(3x) = sinh(x)(3 + 4sinh^2(x))
          // i.e. sinh(x) = sinh(x/3)(3 + 4sinh^2(x/3))
          // 3 multiplications and 1 addition

          // Argument reduction: sinh(5x) = sinh(x)(5 + sinh^2(x)(20 + 16sinh^2(x)))
          // i.e. sinh(x) = sinh(x/5)(5 + sinh^2(x/5)(20 + 16sinh^2(x/5)))
          // 4 multiplications and 2 additions

          // Estimate the optimum number of times to use the argument reduction.
          k = 1.4 * Math.sqrt(len);
          k = k > 16 ? 16 : k | 0;

          x = x.times(1 / tinyPow(5, k));
          x = taylorSeries(Ctor, 2, x, x, true);

          // Reverse argument reduction
          var sinh2_x,
            d5 = new Ctor(5),
            d16 = new Ctor(16),
            d20 = new Ctor(20);
          for (; k--;) {
            sinh2_x = x.times(x);
            x = x.times(d5.plus(sinh2_x.times(d16.times(sinh2_x).plus(d20))));
          }
        }

        Ctor.precision = pr;
        Ctor.rounding = rm;

        return finalise(x, pr, rm, true);
      };


      /*
       * Return a new Decimal whose value is the hyperbolic tangent of the value in radians of this
       * Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-1, 1]
       *
       * tanh(x) = sinh(x) / cosh(x)
       *
       * tanh(0)         = 0
       * tanh(-0)        = -0
       * tanh(Infinity)  = 1
       * tanh(-Infinity) = -1
       * tanh(NaN)       = NaN
       *
       */
      P.hyperbolicTangent = P.tanh = function () {
        var pr, rm,
          x = this,
          Ctor = x.constructor;

        if (!x.isFinite()) return new Ctor(x.s);
        if (x.isZero()) return new Ctor(x);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + 7;
        Ctor.rounding = 1;

        return divide(x.sinh(), x.cosh(), Ctor.precision = pr, Ctor.rounding = rm);
      };


      /*
       * Return a new Decimal whose value is the arccosine (inverse cosine) in radians of the value of
       * this Decimal.
       *
       * Domain: [-1, 1]
       * Range: [0, pi]
       *
       * acos(x) = pi/2 - asin(x)
       *
       * acos(0)       = pi/2
       * acos(-0)      = pi/2
       * acos(1)       = 0
       * acos(-1)      = pi
       * acos(1/2)     = pi/3
       * acos(-1/2)    = 2*pi/3
       * acos(|x| > 1) = NaN
       * acos(NaN)     = NaN
       *
       */
      P.inverseCosine = P.acos = function () {
        var halfPi,
          x = this,
          Ctor = x.constructor,
          k = x.abs().cmp(1),
          pr = Ctor.precision,
          rm = Ctor.rounding;

        if (k !== -1) {
          return k === 0
            // |x| is 1
            ? x.isNeg() ? getPi(Ctor, pr, rm) : new Ctor(0)
            // |x| > 1 or x is NaN
            : new Ctor(NaN);
        }

        if (x.isZero()) return getPi(Ctor, pr + 4, rm).times(0.5);

        // TODO? Special case acos(0.5) = pi/3 and acos(-0.5) = 2*pi/3

        Ctor.precision = pr + 6;
        Ctor.rounding = 1;

        x = x.asin();
        halfPi = getPi(Ctor, pr + 4, rm).times(0.5);

        Ctor.precision = pr;
        Ctor.rounding = rm;

        return halfPi.minus(x);
      };


      /*
       * Return a new Decimal whose value is the inverse of the hyperbolic cosine in radians of the
       * value of this Decimal.
       *
       * Domain: [1, Infinity]
       * Range: [0, Infinity]
       *
       * acosh(x) = ln(x + sqrt(x^2 - 1))
       *
       * acosh(x < 1)     = NaN
       * acosh(NaN)       = NaN
       * acosh(Infinity)  = Infinity
       * acosh(-Infinity) = NaN
       * acosh(0)         = NaN
       * acosh(-0)        = NaN
       * acosh(1)         = 0
       * acosh(-1)        = NaN
       *
       */
      P.inverseHyperbolicCosine = P.acosh = function () {
        var pr, rm,
          x = this,
          Ctor = x.constructor;

        if (x.lte(1)) return new Ctor(x.eq(1) ? 0 : NaN);
        if (!x.isFinite()) return new Ctor(x);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + Math.max(Math.abs(x.e), x.sd()) + 4;
        Ctor.rounding = 1;
        external = false;

        x = x.times(x).minus(1).sqrt().plus(x);

        external = true;
        Ctor.precision = pr;
        Ctor.rounding = rm;

        return x.ln();
      };


      /*
       * Return a new Decimal whose value is the inverse of the hyperbolic sine in radians of the value
       * of this Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-Infinity, Infinity]
       *
       * asinh(x) = ln(x + sqrt(x^2 + 1))
       *
       * asinh(NaN)       = NaN
       * asinh(Infinity)  = Infinity
       * asinh(-Infinity) = -Infinity
       * asinh(0)         = 0
       * asinh(-0)        = -0
       *
       */
      P.inverseHyperbolicSine = P.asinh = function () {
        var pr, rm,
          x = this,
          Ctor = x.constructor;

        if (!x.isFinite() || x.isZero()) return new Ctor(x);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + 2 * Math.max(Math.abs(x.e), x.sd()) + 6;
        Ctor.rounding = 1;
        external = false;

        x = x.times(x).plus(1).sqrt().plus(x);

        external = true;
        Ctor.precision = pr;
        Ctor.rounding = rm;

        return x.ln();
      };


      /*
       * Return a new Decimal whose value is the inverse of the hyperbolic tangent in radians of the
       * value of this Decimal.
       *
       * Domain: [-1, 1]
       * Range: [-Infinity, Infinity]
       *
       * atanh(x) = 0.5 * ln((1 + x) / (1 - x))
       *
       * atanh(|x| > 1)   = NaN
       * atanh(NaN)       = NaN
       * atanh(Infinity)  = NaN
       * atanh(-Infinity) = NaN
       * atanh(0)         = 0
       * atanh(-0)        = -0
       * atanh(1)         = Infinity
       * atanh(-1)        = -Infinity
       *
       */
      P.inverseHyperbolicTangent = P.atanh = function () {
        var pr, rm, wpr, xsd,
          x = this,
          Ctor = x.constructor;

        if (!x.isFinite()) return new Ctor(NaN);
        if (x.e >= 0) return new Ctor(x.abs().eq(1) ? x.s / 0 : x.isZero() ? x : NaN);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        xsd = x.sd();

        if (Math.max(xsd, pr) < 2 * -x.e - 1) return finalise(new Ctor(x), pr, rm, true);

        Ctor.precision = wpr = xsd - x.e;

        x = divide(x.plus(1), new Ctor(1).minus(x), wpr + pr, 1);

        Ctor.precision = pr + 4;
        Ctor.rounding = 1;

        x = x.ln();

        Ctor.precision = pr;
        Ctor.rounding = rm;

        return x.times(0.5);
      };


      /*
       * Return a new Decimal whose value is the arcsine (inverse sine) in radians of the value of this
       * Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-pi/2, pi/2]
       *
       * asin(x) = 2*atan(x/(1 + sqrt(1 - x^2)))
       *
       * asin(0)       = 0
       * asin(-0)      = -0
       * asin(1/2)     = pi/6
       * asin(-1/2)    = -pi/6
       * asin(1)       = pi/2
       * asin(-1)      = -pi/2
       * asin(|x| > 1) = NaN
       * asin(NaN)     = NaN
       *
       * TODO? Compare performance of Taylor series.
       *
       */
      P.inverseSine = P.asin = function () {
        var halfPi, k,
          pr, rm,
          x = this,
          Ctor = x.constructor;

        if (x.isZero()) return new Ctor(x);

        k = x.abs().cmp(1);
        pr = Ctor.precision;
        rm = Ctor.rounding;

        if (k !== -1) {

          // |x| is 1
          if (k === 0) {
            halfPi = getPi(Ctor, pr + 4, rm).times(0.5);
            halfPi.s = x.s;
            return halfPi;
          }

          // |x| > 1 or x is NaN
          return new Ctor(NaN);
        }

        // TODO? Special case asin(1/2) = pi/6 and asin(-1/2) = -pi/6

        Ctor.precision = pr + 6;
        Ctor.rounding = 1;

        x = x.div(new Ctor(1).minus(x.times(x)).sqrt().plus(1)).atan();

        Ctor.precision = pr;
        Ctor.rounding = rm;

        return x.times(2);
      };


      /*
       * Return a new Decimal whose value is the arctangent (inverse tangent) in radians of the value
       * of this Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-pi/2, pi/2]
       *
       * atan(x) = x - x^3/3 + x^5/5 - x^7/7 + ...
       *
       * atan(0)         = 0
       * atan(-0)        = -0
       * atan(1)         = pi/4
       * atan(-1)        = -pi/4
       * atan(Infinity)  = pi/2
       * atan(-Infinity) = -pi/2
       * atan(NaN)       = NaN
       *
       */
      P.inverseTangent = P.atan = function () {
        var i, j, k, n, px, t, r, wpr, x2,
          x = this,
          Ctor = x.constructor,
          pr = Ctor.precision,
          rm = Ctor.rounding;

        if (!x.isFinite()) {
          if (!x.s) return new Ctor(NaN);
          if (pr + 4 <= PI_PRECISION) {
            r = getPi(Ctor, pr + 4, rm).times(0.5);
            r.s = x.s;
            return r;
          }
        } else if (x.isZero()) {
          return new Ctor(x);
        } else if (x.abs().eq(1) && pr + 4 <= PI_PRECISION) {
          r = getPi(Ctor, pr + 4, rm).times(0.25);
          r.s = x.s;
          return r;
        }

        Ctor.precision = wpr = pr + 10;
        Ctor.rounding = 1;

        // TODO? if (x >= 1 && pr <= PI_PRECISION) atan(x) = halfPi * x.s - atan(1 / x);

        // Argument reduction
        // Ensure |x| < 0.42
        // atan(x) = 2 * atan(x / (1 + sqrt(1 + x^2)))

        k = Math.min(28, wpr / LOG_BASE + 2 | 0);

        for (i = k; i; --i) x = x.div(x.times(x).plus(1).sqrt().plus(1));

        external = false;

        j = Math.ceil(wpr / LOG_BASE);
        n = 1;
        x2 = x.times(x);
        r = new Ctor(x);
        px = x;

        // atan(x) = x - x^3/3 + x^5/5 - x^7/7 + ...
        for (; i !== -1;) {
          px = px.times(x2);
          t = r.minus(px.div(n += 2));

          px = px.times(x2);
          r = t.plus(px.div(n += 2));

          if (r.d[j] !== void 0) for (i = j; r.d[i] === t.d[i] && i--;);
        }

        if (k) r = r.times(2 << (k - 1));

        external = true;

        return finalise(r, Ctor.precision = pr, Ctor.rounding = rm, true);
      };


      /*
       * Return true if the value of this Decimal is a finite number, otherwise return false.
       *
       */
      P.isFinite = function () {
        return !!this.d;
      };


      /*
       * Return true if the value of this Decimal is an integer, otherwise return false.
       *
       */
      P.isInteger = P.isInt = function () {
        return !!this.d && mathfloor(this.e / LOG_BASE) > this.d.length - 2;
      };


      /*
       * Return true if the value of this Decimal is NaN, otherwise return false.
       *
       */
      P.isNaN = function () {
        return !this.s;
      };


      /*
       * Return true if the value of this Decimal is negative, otherwise return false.
       *
       */
      P.isNegative = P.isNeg = function () {
        return this.s < 0;
      };


      /*
       * Return true if the value of this Decimal is positive, otherwise return false.
       *
       */
      P.isPositive = P.isPos = function () {
        return this.s > 0;
      };


      /*
       * Return true if the value of this Decimal is 0 or -0, otherwise return false.
       *
       */
      P.isZero = function () {
        return !!this.d && this.d[0] === 0;
      };


      /*
       * Return true if the value of this Decimal is less than `y`, otherwise return false.
       *
       */
      P.lessThan = P.lt = function (y) {
        return this.cmp(y) < 0;
      };


      /*
       * Return true if the value of this Decimal is less than or equal to `y`, otherwise return false.
       *
       */
      P.lessThanOrEqualTo = P.lte = function (y) {
        return this.cmp(y) < 1;
      };


      /*
       * Return the logarithm of the value of this Decimal to the specified base, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * If no base is specified, return log[10](arg).
       *
       * log[base](arg) = ln(arg) / ln(base)
       *
       * The result will always be correctly rounded if the base of the log is 10, and 'almost always'
       * otherwise:
       *
       * Depending on the rounding mode, the result may be incorrectly rounded if the first fifteen
       * rounding digits are [49]99999999999999 or [50]00000000000000. In that case, the maximum error
       * between the result and the correctly rounded result will be one ulp (unit in the last place).
       *
       * log[-b](a)       = NaN
       * log[0](a)        = NaN
       * log[1](a)        = NaN
       * log[NaN](a)      = NaN
       * log[Infinity](a) = NaN
       * log[b](0)        = -Infinity
       * log[b](-0)       = -Infinity
       * log[b](-a)       = NaN
       * log[b](1)        = 0
       * log[b](Infinity) = Infinity
       * log[b](NaN)      = NaN
       *
       * [base] {number|string|Decimal} The base of the logarithm.
       *
       */
      P.logarithm = P.log = function (base) {
        var isBase10, d, denominator, k, inf, num, sd, r,
          arg = this,
          Ctor = arg.constructor,
          pr = Ctor.precision,
          rm = Ctor.rounding,
          guard = 5;

        // Default base is 10.
        if (base == null) {
          base = new Ctor(10);
          isBase10 = true;
        } else {
          base = new Ctor(base);
          d = base.d;

          // Return NaN if base is negative, or non-finite, or is 0 or 1.
          if (base.s < 0 || !d || !d[0] || base.eq(1)) return new Ctor(NaN);

          isBase10 = base.eq(10);
        }

        d = arg.d;

        // Is arg negative, non-finite, 0 or 1?
        if (arg.s < 0 || !d || !d[0] || arg.eq(1)) {
          return new Ctor(d && !d[0] ? -1 / 0 : arg.s != 1 ? NaN : d ? 0 : 1 / 0);
        }

        // The result will have a non-terminating decimal expansion if base is 10 and arg is not an
        // integer power of 10.
        if (isBase10) {
          if (d.length > 1) {
            inf = true;
          } else {
            for (k = d[0]; k % 10 === 0;) k /= 10;
            inf = k !== 1;
          }
        }

        external = false;
        sd = pr + guard;
        num = naturalLogarithm(arg, sd);
        denominator = isBase10 ? getLn10(Ctor, sd + 10) : naturalLogarithm(base, sd);

        // The result will have 5 rounding digits.
        r = divide(num, denominator, sd, 1);

        // If at a rounding boundary, i.e. the result's rounding digits are [49]9999 or [50]0000,
        // calculate 10 further digits.
        //
        // If the result is known to have an infinite decimal expansion, repeat this until it is clear
        // that the result is above or below the boundary. Otherwise, if after calculating the 10
        // further digits, the last 14 are nines, round up and assume the result is exact.
        // Also assume the result is exact if the last 14 are zero.
        //
        // Example of a result that will be incorrectly rounded:
        // log[1048576](4503599627370502) = 2.60000000000000009610279511444746...
        // The above result correctly rounded using ROUND_CEIL to 1 decimal place should be 2.7, but it
        // will be given as 2.6 as there are 15 zeros immediately after the requested decimal place, so
        // the exact result would be assumed to be 2.6, which rounded using ROUND_CEIL to 1 decimal
        // place is still 2.6.
        if (checkRoundingDigits(r.d, k = pr, rm)) {

          do {
            sd += 10;
            num = naturalLogarithm(arg, sd);
            denominator = isBase10 ? getLn10(Ctor, sd + 10) : naturalLogarithm(base, sd);
            r = divide(num, denominator, sd, 1);

            if (!inf) {

              // Check for 14 nines from the 2nd rounding digit, as the first may be 4.
              if (+digitsToString(r.d).slice(k + 1, k + 15) + 1 == 1e14) {
                r = finalise(r, pr + 1, 0);
              }

              break;
            }
          } while (checkRoundingDigits(r.d, k += 10, rm));
        }

        external = true;

        return finalise(r, pr, rm);
      };


      /*
       * Return a new Decimal whose value is the maximum of the arguments and the value of this Decimal.
       *
       * arguments {number|string|Decimal}
       *
      P.max = function () {
        Array.prototype.push.call(arguments, this);
        return maxOrMin(this.constructor, arguments, 'lt');
      };
       */


      /*
       * Return a new Decimal whose value is the minimum of the arguments and the value of this Decimal.
       *
       * arguments {number|string|Decimal}
       *
      P.min = function () {
        Array.prototype.push.call(arguments, this);
        return maxOrMin(this.constructor, arguments, 'gt');
      };
       */


      /*
       *  n - 0 = n
       *  n - N = N
       *  n - I = -I
       *  0 - n = -n
       *  0 - 0 = 0
       *  0 - N = N
       *  0 - I = -I
       *  N - n = N
       *  N - 0 = N
       *  N - N = N
       *  N - I = N
       *  I - n = I
       *  I - 0 = I
       *  I - N = N
       *  I - I = N
       *
       * Return a new Decimal whose value is the value of this Decimal minus `y`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       */
      P.minus = P.sub = function (y) {
        var d, e, i, j, k, len, pr, rm, xd, xe, xLTy, yd,
          x = this,
          Ctor = x.constructor;

        y = new Ctor(y);

        // If either is not finite...
        if (!x.d || !y.d) {

          // Return NaN if either is NaN.
          if (!x.s || !y.s) y = new Ctor(NaN);

          // Return y negated if x is finite and y is ±Infinity.
          else if (x.d) y.s = -y.s;

          // Return x if y is finite and x is ±Infinity.
          // Return x if both are ±Infinity with different signs.
          // Return NaN if both are ±Infinity with the same sign.
          else y = new Ctor(y.d || x.s !== y.s ? x : NaN);

          return y;
        }

        // If signs differ...
        if (x.s != y.s) {
          y.s = -y.s;
          return x.plus(y);
        }

        xd = x.d;
        yd = y.d;
        pr = Ctor.precision;
        rm = Ctor.rounding;

        // If either is zero...
        if (!xd[0] || !yd[0]) {

          // Return y negated if x is zero and y is non-zero.
          if (yd[0]) y.s = -y.s;

          // Return x if y is zero and x is non-zero.
          else if (xd[0]) y = new Ctor(x);

          // Return zero if both are zero.
          // From IEEE 754 (2008) 6.3: 0 - 0 = -0 - -0 = -0 when rounding to -Infinity.
          else return new Ctor(rm === 3 ? -0 : 0);

          return external ? finalise(y, pr, rm) : y;
        }

        // x and y are finite, non-zero numbers with the same sign.

        // Calculate base 1e7 exponents.
        e = mathfloor(y.e / LOG_BASE);
        xe = mathfloor(x.e / LOG_BASE);

        xd = xd.slice();
        k = xe - e;

        // If base 1e7 exponents differ...
        if (k) {
          xLTy = k < 0;

          if (xLTy) {
            d = xd;
            k = -k;
            len = yd.length;
          } else {
            d = yd;
            e = xe;
            len = xd.length;
          }

          // Numbers with massively different exponents would result in a very high number of
          // zeros needing to be prepended, but this can be avoided while still ensuring correct
          // rounding by limiting the number of zeros to `Math.ceil(pr / LOG_BASE) + 2`.
          i = Math.max(Math.ceil(pr / LOG_BASE), len) + 2;

          if (k > i) {
            k = i;
            d.length = 1;
          }

          // Prepend zeros to equalise exponents.
          d.reverse();
          for (i = k; i--;) d.push(0);
          d.reverse();

        // Base 1e7 exponents equal.
        } else {

          // Check digits to determine which is the bigger number.

          i = xd.length;
          len = yd.length;
          xLTy = i < len;
          if (xLTy) len = i;

          for (i = 0; i < len; i++) {
            if (xd[i] != yd[i]) {
              xLTy = xd[i] < yd[i];
              break;
            }
          }

          k = 0;
        }

        if (xLTy) {
          d = xd;
          xd = yd;
          yd = d;
          y.s = -y.s;
        }

        len = xd.length;

        // Append zeros to `xd` if shorter.
        // Don't add zeros to `yd` if shorter as subtraction only needs to start at `yd` length.
        for (i = yd.length - len; i > 0; --i) xd[len++] = 0;

        // Subtract yd from xd.
        for (i = yd.length; i > k;) {

          if (xd[--i] < yd[i]) {
            for (j = i; j && xd[--j] === 0;) xd[j] = BASE - 1;
            --xd[j];
            xd[i] += BASE;
          }

          xd[i] -= yd[i];
        }

        // Remove trailing zeros.
        for (; xd[--len] === 0;) xd.pop();

        // Remove leading zeros and adjust exponent accordingly.
        for (; xd[0] === 0; xd.shift()) --e;

        // Zero?
        if (!xd[0]) return new Ctor(rm === 3 ? -0 : 0);

        y.d = xd;
        y.e = getBase10Exponent(xd, e);

        return external ? finalise(y, pr, rm) : y;
      };


      /*
       *   n % 0 =  N
       *   n % N =  N
       *   n % I =  n
       *   0 % n =  0
       *  -0 % n = -0
       *   0 % 0 =  N
       *   0 % N =  N
       *   0 % I =  0
       *   N % n =  N
       *   N % 0 =  N
       *   N % N =  N
       *   N % I =  N
       *   I % n =  N
       *   I % 0 =  N
       *   I % N =  N
       *   I % I =  N
       *
       * Return a new Decimal whose value is the value of this Decimal modulo `y`, rounded to
       * `precision` significant digits using rounding mode `rounding`.
       *
       * The result depends on the modulo mode.
       *
       */
      P.modulo = P.mod = function (y) {
        var q,
          x = this,
          Ctor = x.constructor;

        y = new Ctor(y);

        // Return NaN if x is ±Infinity or NaN, or y is NaN or ±0.
        if (!x.d || !y.s || y.d && !y.d[0]) return new Ctor(NaN);

        // Return x if y is ±Infinity or x is ±0.
        if (!y.d || x.d && !x.d[0]) {
          return finalise(new Ctor(x), Ctor.precision, Ctor.rounding);
        }

        // Prevent rounding of intermediate calculations.
        external = false;

        if (Ctor.modulo == 9) {

          // Euclidian division: q = sign(y) * floor(x / abs(y))
          // result = x - q * y    where  0 <= result < abs(y)
          q = divide(x, y.abs(), 0, 3, 1);
          q.s *= y.s;
        } else {
          q = divide(x, y, 0, Ctor.modulo, 1);
        }

        q = q.times(y);

        external = true;

        return x.minus(q);
      };


      /*
       * Return a new Decimal whose value is the natural exponential of the value of this Decimal,
       * i.e. the base e raised to the power the value of this Decimal, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       */
      P.naturalExponential = P.exp = function () {
        return naturalExponential(this);
      };


      /*
       * Return a new Decimal whose value is the natural logarithm of the value of this Decimal,
       * rounded to `precision` significant digits using rounding mode `rounding`.
       *
       */
      P.naturalLogarithm = P.ln = function () {
        return naturalLogarithm(this);
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal negated, i.e. as if multiplied by
       * -1.
       *
       */
      P.negated = P.neg = function () {
        var x = new this.constructor(this);
        x.s = -x.s;
        return finalise(x);
      };


      /*
       *  n + 0 = n
       *  n + N = N
       *  n + I = I
       *  0 + n = n
       *  0 + 0 = 0
       *  0 + N = N
       *  0 + I = I
       *  N + n = N
       *  N + 0 = N
       *  N + N = N
       *  N + I = N
       *  I + n = I
       *  I + 0 = I
       *  I + N = N
       *  I + I = I
       *
       * Return a new Decimal whose value is the value of this Decimal plus `y`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       */
      P.plus = P.add = function (y) {
        var carry, d, e, i, k, len, pr, rm, xd, yd,
          x = this,
          Ctor = x.constructor;

        y = new Ctor(y);

        // If either is not finite...
        if (!x.d || !y.d) {

          // Return NaN if either is NaN.
          if (!x.s || !y.s) y = new Ctor(NaN);

          // Return x if y is finite and x is ±Infinity.
          // Return x if both are ±Infinity with the same sign.
          // Return NaN if both are ±Infinity with different signs.
          // Return y if x is finite and y is ±Infinity.
          else if (!x.d) y = new Ctor(y.d || x.s === y.s ? x : NaN);

          return y;
        }

         // If signs differ...
        if (x.s != y.s) {
          y.s = -y.s;
          return x.minus(y);
        }

        xd = x.d;
        yd = y.d;
        pr = Ctor.precision;
        rm = Ctor.rounding;

        // If either is zero...
        if (!xd[0] || !yd[0]) {

          // Return x if y is zero.
          // Return y if y is non-zero.
          if (!yd[0]) y = new Ctor(x);

          return external ? finalise(y, pr, rm) : y;
        }

        // x and y are finite, non-zero numbers with the same sign.

        // Calculate base 1e7 exponents.
        k = mathfloor(x.e / LOG_BASE);
        e = mathfloor(y.e / LOG_BASE);

        xd = xd.slice();
        i = k - e;

        // If base 1e7 exponents differ...
        if (i) {

          if (i < 0) {
            d = xd;
            i = -i;
            len = yd.length;
          } else {
            d = yd;
            e = k;
            len = xd.length;
          }

          // Limit number of zeros prepended to max(ceil(pr / LOG_BASE), len) + 1.
          k = Math.ceil(pr / LOG_BASE);
          len = k > len ? k + 1 : len + 1;

          if (i > len) {
            i = len;
            d.length = 1;
          }

          // Prepend zeros to equalise exponents. Note: Faster to use reverse then do unshifts.
          d.reverse();
          for (; i--;) d.push(0);
          d.reverse();
        }

        len = xd.length;
        i = yd.length;

        // If yd is longer than xd, swap xd and yd so xd points to the longer array.
        if (len - i < 0) {
          i = len;
          d = yd;
          yd = xd;
          xd = d;
        }

        // Only start adding at yd.length - 1 as the further digits of xd can be left as they are.
        for (carry = 0; i;) {
          carry = (xd[--i] = xd[i] + yd[i] + carry) / BASE | 0;
          xd[i] %= BASE;
        }

        if (carry) {
          xd.unshift(carry);
          ++e;
        }

        // Remove trailing zeros.
        // No need to check for zero, as +x + +y != 0 && -x + -y != 0
        for (len = xd.length; xd[--len] == 0;) xd.pop();

        y.d = xd;
        y.e = getBase10Exponent(xd, e);

        return external ? finalise(y, pr, rm) : y;
      };


      /*
       * Return the number of significant digits of the value of this Decimal.
       *
       * [z] {boolean|number} Whether to count integer-part trailing zeros: true, false, 1 or 0.
       *
       */
      P.precision = P.sd = function (z) {
        var k,
          x = this;

        if (z !== void 0 && z !== !!z && z !== 1 && z !== 0) throw Error(invalidArgument + z);

        if (x.d) {
          k = getPrecision(x.d);
          if (z && x.e + 1 > k) k = x.e + 1;
        } else {
          k = NaN;
        }

        return k;
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal rounded to a whole number using
       * rounding mode `rounding`.
       *
       */
      P.round = function () {
        var x = this,
          Ctor = x.constructor;

        return finalise(new Ctor(x), x.e + 1, Ctor.rounding);
      };


      /*
       * Return a new Decimal whose value is the sine of the value in radians of this Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-1, 1]
       *
       * sin(x) = x - x^3/3! + x^5/5! - ...
       *
       * sin(0)         = 0
       * sin(-0)        = -0
       * sin(Infinity)  = NaN
       * sin(-Infinity) = NaN
       * sin(NaN)       = NaN
       *
       */
      P.sine = P.sin = function () {
        var pr, rm,
          x = this,
          Ctor = x.constructor;

        if (!x.isFinite()) return new Ctor(NaN);
        if (x.isZero()) return new Ctor(x);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + Math.max(x.e, x.sd()) + LOG_BASE;
        Ctor.rounding = 1;

        x = sine(Ctor, toLessThanHalfPi(Ctor, x));

        Ctor.precision = pr;
        Ctor.rounding = rm;

        return finalise(quadrant > 2 ? x.neg() : x, pr, rm, true);
      };


      /*
       * Return a new Decimal whose value is the square root of this Decimal, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       *  sqrt(-n) =  N
       *  sqrt(N)  =  N
       *  sqrt(-I) =  N
       *  sqrt(I)  =  I
       *  sqrt(0)  =  0
       *  sqrt(-0) = -0
       *
       */
      P.squareRoot = P.sqrt = function () {
        var m, n, sd, r, rep, t,
          x = this,
          d = x.d,
          e = x.e,
          s = x.s,
          Ctor = x.constructor;

        // Negative/NaN/Infinity/zero?
        if (s !== 1 || !d || !d[0]) {
          return new Ctor(!s || s < 0 && (!d || d[0]) ? NaN : d ? x : 1 / 0);
        }

        external = false;

        // Initial estimate.
        s = Math.sqrt(+x);

        // Math.sqrt underflow/overflow?
        // Pass x to Math.sqrt as integer, then adjust the exponent of the result.
        if (s == 0 || s == 1 / 0) {
          n = digitsToString(d);

          if ((n.length + e) % 2 == 0) n += '0';
          s = Math.sqrt(n);
          e = mathfloor((e + 1) / 2) - (e < 0 || e % 2);

          if (s == 1 / 0) {
            n = '5e' + e;
          } else {
            n = s.toExponential();
            n = n.slice(0, n.indexOf('e') + 1) + e;
          }

          r = new Ctor(n);
        } else {
          r = new Ctor(s.toString());
        }

        sd = (e = Ctor.precision) + 3;

        // Newton-Raphson iteration.
        for (;;) {
          t = r;
          r = t.plus(divide(x, t, sd + 2, 1)).times(0.5);

          // TODO? Replace with for-loop and checkRoundingDigits.
          if (digitsToString(t.d).slice(0, sd) === (n = digitsToString(r.d)).slice(0, sd)) {
            n = n.slice(sd - 3, sd + 1);

            // The 4th rounding digit may be in error by -1 so if the 4 rounding digits are 9999 or
            // 4999, i.e. approaching a rounding boundary, continue the iteration.
            if (n == '9999' || !rep && n == '4999') {

              // On the first iteration only, check to see if rounding up gives the exact result as the
              // nines may infinitely repeat.
              if (!rep) {
                finalise(t, e + 1, 0);

                if (t.times(t).eq(x)) {
                  r = t;
                  break;
                }
              }

              sd += 4;
              rep = 1;
            } else {

              // If the rounding digits are null, 0{0,4} or 50{0,3}, check for an exact result.
              // If not, then there are further digits and m will be truthy.
              if (!+n || !+n.slice(1) && n.charAt(0) == '5') {

                // Truncate to the first rounding digit.
                finalise(r, e + 1, 1);
                m = !r.times(r).eq(x);
              }

              break;
            }
          }
        }

        external = true;

        return finalise(r, e, Ctor.rounding, m);
      };


      /*
       * Return a new Decimal whose value is the tangent of the value in radians of this Decimal.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-Infinity, Infinity]
       *
       * tan(0)         = 0
       * tan(-0)        = -0
       * tan(Infinity)  = NaN
       * tan(-Infinity) = NaN
       * tan(NaN)       = NaN
       *
       */
      P.tangent = P.tan = function () {
        var pr, rm,
          x = this,
          Ctor = x.constructor;

        if (!x.isFinite()) return new Ctor(NaN);
        if (x.isZero()) return new Ctor(x);

        pr = Ctor.precision;
        rm = Ctor.rounding;
        Ctor.precision = pr + 10;
        Ctor.rounding = 1;

        x = x.sin();
        x.s = 1;
        x = divide(x, new Ctor(1).minus(x.times(x)).sqrt(), pr + 10, 0);

        Ctor.precision = pr;
        Ctor.rounding = rm;

        return finalise(quadrant == 2 || quadrant == 4 ? x.neg() : x, pr, rm, true);
      };


      /*
       *  n * 0 = 0
       *  n * N = N
       *  n * I = I
       *  0 * n = 0
       *  0 * 0 = 0
       *  0 * N = N
       *  0 * I = N
       *  N * n = N
       *  N * 0 = N
       *  N * N = N
       *  N * I = N
       *  I * n = I
       *  I * 0 = N
       *  I * N = N
       *  I * I = I
       *
       * Return a new Decimal whose value is this Decimal times `y`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       */
      P.times = P.mul = function (y) {
        var carry, e, i, k, r, rL, t, xdL, ydL,
          x = this,
          Ctor = x.constructor,
          xd = x.d,
          yd = (y = new Ctor(y)).d;

        y.s *= x.s;

         // If either is NaN, ±Infinity or ±0...
        if (!xd || !xd[0] || !yd || !yd[0]) {

          return new Ctor(!y.s || xd && !xd[0] && !yd || yd && !yd[0] && !xd

            // Return NaN if either is NaN.
            // Return NaN if x is ±0 and y is ±Infinity, or y is ±0 and x is ±Infinity.
            ? NaN

            // Return ±Infinity if either is ±Infinity.
            // Return ±0 if either is ±0.
            : !xd || !yd ? y.s / 0 : y.s * 0);
        }

        e = mathfloor(x.e / LOG_BASE) + mathfloor(y.e / LOG_BASE);
        xdL = xd.length;
        ydL = yd.length;

        // Ensure xd points to the longer array.
        if (xdL < ydL) {
          r = xd;
          xd = yd;
          yd = r;
          rL = xdL;
          xdL = ydL;
          ydL = rL;
        }

        // Initialise the result array with zeros.
        r = [];
        rL = xdL + ydL;
        for (i = rL; i--;) r.push(0);

        // Multiply!
        for (i = ydL; --i >= 0;) {
          carry = 0;
          for (k = xdL + i; k > i;) {
            t = r[k] + yd[i] * xd[k - i - 1] + carry;
            r[k--] = t % BASE | 0;
            carry = t / BASE | 0;
          }

          r[k] = (r[k] + carry) % BASE | 0;
        }

        // Remove trailing zeros.
        for (; !r[--rL];) r.pop();

        if (carry) ++e;
        else r.shift();

        y.d = r;
        y.e = getBase10Exponent(r, e);

        return external ? finalise(y, Ctor.precision, Ctor.rounding) : y;
      };


      /*
       * Return a string representing the value of this Decimal in base 2, round to `sd` significant
       * digits using rounding mode `rm`.
       *
       * If the optional `sd` argument is present then return binary exponential notation.
       *
       * [sd] {number} Significant digits. Integer, 1 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       */
      P.toBinary = function (sd, rm) {
        return toStringBinary(this, 2, sd, rm);
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal rounded to a maximum of `dp`
       * decimal places using rounding mode `rm` or `rounding` if `rm` is omitted.
       *
       * If `dp` is omitted, return a new Decimal whose value is the value of this Decimal.
       *
       * [dp] {number} Decimal places. Integer, 0 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       */
      P.toDecimalPlaces = P.toDP = function (dp, rm) {
        var x = this,
          Ctor = x.constructor;

        x = new Ctor(x);
        if (dp === void 0) return x;

        checkInt32(dp, 0, MAX_DIGITS);

        if (rm === void 0) rm = Ctor.rounding;
        else checkInt32(rm, 0, 8);

        return finalise(x, dp + x.e + 1, rm);
      };


      /*
       * Return a string representing the value of this Decimal in exponential notation rounded to
       * `dp` fixed decimal places using rounding mode `rounding`.
       *
       * [dp] {number} Decimal places. Integer, 0 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       */
      P.toExponential = function (dp, rm) {
        var str,
          x = this,
          Ctor = x.constructor;

        if (dp === void 0) {
          str = finiteToString(x, true);
        } else {
          checkInt32(dp, 0, MAX_DIGITS);

          if (rm === void 0) rm = Ctor.rounding;
          else checkInt32(rm, 0, 8);

          x = finalise(new Ctor(x), dp + 1, rm);
          str = finiteToString(x, true, dp + 1);
        }

        return x.isNeg() && !x.isZero() ? '-' + str : str;
      };


      /*
       * Return a string representing the value of this Decimal in normal (fixed-point) notation to
       * `dp` fixed decimal places and rounded using rounding mode `rm` or `rounding` if `rm` is
       * omitted.
       *
       * As with JavaScript numbers, (-0).toFixed(0) is '0', but e.g. (-0.00001).toFixed(0) is '-0'.
       *
       * [dp] {number} Decimal places. Integer, 0 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       * (-0).toFixed(0) is '0', but (-0.1).toFixed(0) is '-0'.
       * (-0).toFixed(1) is '0.0', but (-0.01).toFixed(1) is '-0.0'.
       * (-0).toFixed(3) is '0.000'.
       * (-0.5).toFixed(0) is '-0'.
       *
       */
      P.toFixed = function (dp, rm) {
        var str, y,
          x = this,
          Ctor = x.constructor;

        if (dp === void 0) {
          str = finiteToString(x);
        } else {
          checkInt32(dp, 0, MAX_DIGITS);

          if (rm === void 0) rm = Ctor.rounding;
          else checkInt32(rm, 0, 8);

          y = finalise(new Ctor(x), dp + x.e + 1, rm);
          str = finiteToString(y, false, dp + y.e + 1);
        }

        // To determine whether to add the minus sign look at the value before it was rounded,
        // i.e. look at `x` rather than `y`.
        return x.isNeg() && !x.isZero() ? '-' + str : str;
      };


      /*
       * Return an array representing the value of this Decimal as a simple fraction with an integer
       * numerator and an integer denominator.
       *
       * The denominator will be a positive non-zero value less than or equal to the specified maximum
       * denominator. If a maximum denominator is not specified, the denominator will be the lowest
       * value necessary to represent the number exactly.
       *
       * [maxD] {number|string|Decimal} Maximum denominator. Integer >= 1 and < Infinity.
       *
       */
      P.toFraction = function (maxD) {
        var d, d0, d1, d2, e, k, n, n0, n1, pr, q, r,
          x = this,
          xd = x.d,
          Ctor = x.constructor;

        if (!xd) return new Ctor(x);

        n1 = d0 = new Ctor(1);
        d1 = n0 = new Ctor(0);

        d = new Ctor(d1);
        e = d.e = getPrecision(xd) - x.e - 1;
        k = e % LOG_BASE;
        d.d[0] = mathpow(10, k < 0 ? LOG_BASE + k : k);

        if (maxD == null) {

          // d is 10**e, the minimum max-denominator needed.
          maxD = e > 0 ? d : n1;
        } else {
          n = new Ctor(maxD);
          if (!n.isInt() || n.lt(n1)) throw Error(invalidArgument + n);
          maxD = n.gt(d) ? (e > 0 ? d : n1) : n;
        }

        external = false;
        n = new Ctor(digitsToString(xd));
        pr = Ctor.precision;
        Ctor.precision = e = xd.length * LOG_BASE * 2;

        for (;;)  {
          q = divide(n, d, 0, 1, 1);
          d2 = d0.plus(q.times(d1));
          if (d2.cmp(maxD) == 1) break;
          d0 = d1;
          d1 = d2;
          d2 = n1;
          n1 = n0.plus(q.times(d2));
          n0 = d2;
          d2 = d;
          d = n.minus(q.times(d2));
          n = d2;
        }

        d2 = divide(maxD.minus(d0), d1, 0, 1, 1);
        n0 = n0.plus(d2.times(n1));
        d0 = d0.plus(d2.times(d1));
        n0.s = n1.s = x.s;

        // Determine which fraction is closer to x, n0/d0 or n1/d1?
        r = divide(n1, d1, e, 1).minus(x).abs().cmp(divide(n0, d0, e, 1).minus(x).abs()) < 1
            ? [n1, d1] : [n0, d0];

        Ctor.precision = pr;
        external = true;

        return r;
      };


      /*
       * Return a string representing the value of this Decimal in base 16, round to `sd` significant
       * digits using rounding mode `rm`.
       *
       * If the optional `sd` argument is present then return binary exponential notation.
       *
       * [sd] {number} Significant digits. Integer, 1 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       */
      P.toHexadecimal = P.toHex = function (sd, rm) {
        return toStringBinary(this, 16, sd, rm);
      };


      /*
       * Returns a new Decimal whose value is the nearest multiple of `y` in the direction of rounding
       * mode `rm`, or `Decimal.rounding` if `rm` is omitted, to the value of this Decimal.
       *
       * The return value will always have the same sign as this Decimal, unless either this Decimal
       * or `y` is NaN, in which case the return value will be also be NaN.
       *
       * The return value is not affected by the value of `precision`.
       *
       * y {number|string|Decimal} The magnitude to round to a multiple of.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       * 'toNearest() rounding mode not an integer: {rm}'
       * 'toNearest() rounding mode out of range: {rm}'
       *
       */
      P.toNearest = function (y, rm) {
        var x = this,
          Ctor = x.constructor;

        x = new Ctor(x);

        if (y == null) {

          // If x is not finite, return x.
          if (!x.d) return x;

          y = new Ctor(1);
          rm = Ctor.rounding;
        } else {
          y = new Ctor(y);
          if (rm === void 0) {
            rm = Ctor.rounding;
          } else {
            checkInt32(rm, 0, 8);
          }

          // If x is not finite, return x if y is not NaN, else NaN.
          if (!x.d) return y.s ? x : y;

          // If y is not finite, return Infinity with the sign of x if y is Infinity, else NaN.
          if (!y.d) {
            if (y.s) y.s = x.s;
            return y;
          }
        }

        // If y is not zero, calculate the nearest multiple of y to x.
        if (y.d[0]) {
          external = false;
          x = divide(x, y, 0, rm, 1).times(y);
          external = true;
          finalise(x);

        // If y is zero, return zero with the sign of x.
        } else {
          y.s = x.s;
          x = y;
        }

        return x;
      };


      /*
       * Return the value of this Decimal converted to a number primitive.
       * Zero keeps its sign.
       *
       */
      P.toNumber = function () {
        return +this;
      };


      /*
       * Return a string representing the value of this Decimal in base 8, round to `sd` significant
       * digits using rounding mode `rm`.
       *
       * If the optional `sd` argument is present then return binary exponential notation.
       *
       * [sd] {number} Significant digits. Integer, 1 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       */
      P.toOctal = function (sd, rm) {
        return toStringBinary(this, 8, sd, rm);
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal raised to the power `y`, rounded
       * to `precision` significant digits using rounding mode `rounding`.
       *
       * ECMAScript compliant.
       *
       *   pow(x, NaN)                           = NaN
       *   pow(x, ±0)                            = 1

       *   pow(NaN, non-zero)                    = NaN
       *   pow(abs(x) > 1, +Infinity)            = +Infinity
       *   pow(abs(x) > 1, -Infinity)            = +0
       *   pow(abs(x) == 1, ±Infinity)           = NaN
       *   pow(abs(x) < 1, +Infinity)            = +0
       *   pow(abs(x) < 1, -Infinity)            = +Infinity
       *   pow(+Infinity, y > 0)                 = +Infinity
       *   pow(+Infinity, y < 0)                 = +0
       *   pow(-Infinity, odd integer > 0)       = -Infinity
       *   pow(-Infinity, even integer > 0)      = +Infinity
       *   pow(-Infinity, odd integer < 0)       = -0
       *   pow(-Infinity, even integer < 0)      = +0
       *   pow(+0, y > 0)                        = +0
       *   pow(+0, y < 0)                        = +Infinity
       *   pow(-0, odd integer > 0)              = -0
       *   pow(-0, even integer > 0)             = +0
       *   pow(-0, odd integer < 0)              = -Infinity
       *   pow(-0, even integer < 0)             = +Infinity
       *   pow(finite x < 0, finite non-integer) = NaN
       *
       * For non-integer or very large exponents pow(x, y) is calculated using
       *
       *   x^y = exp(y*ln(x))
       *
       * Assuming the first 15 rounding digits are each equally likely to be any digit 0-9, the
       * probability of an incorrectly rounded result
       * P([49]9{14} | [50]0{14}) = 2 * 0.2 * 10^-14 = 4e-15 = 1/2.5e+14
       * i.e. 1 in 250,000,000,000,000
       *
       * If a result is incorrectly rounded the maximum error will be 1 ulp (unit in last place).
       *
       * y {number|string|Decimal} The power to which to raise this Decimal.
       *
       */
      P.toPower = P.pow = function (y) {
        var e, k, pr, r, rm, s,
          x = this,
          Ctor = x.constructor,
          yn = +(y = new Ctor(y));

        // Either ±Infinity, NaN or ±0?
        if (!x.d || !y.d || !x.d[0] || !y.d[0]) return new Ctor(mathpow(+x, yn));

        x = new Ctor(x);

        if (x.eq(1)) return x;

        pr = Ctor.precision;
        rm = Ctor.rounding;

        if (y.eq(1)) return finalise(x, pr, rm);

        // y exponent
        e = mathfloor(y.e / LOG_BASE);

        // If y is a small integer use the 'exponentiation by squaring' algorithm.
        if (e >= y.d.length - 1 && (k = yn < 0 ? -yn : yn) <= MAX_SAFE_INTEGER) {
          r = intPow(Ctor, x, k, pr);
          return y.s < 0 ? new Ctor(1).div(r) : finalise(r, pr, rm);
        }

        s = x.s;

        // if x is negative
        if (s < 0) {

          // if y is not an integer
          if (e < y.d.length - 1) return new Ctor(NaN);

          // Result is positive if x is negative and the last digit of integer y is even.
          if ((y.d[e] & 1) == 0) s = 1;

          // if x.eq(-1)
          if (x.e == 0 && x.d[0] == 1 && x.d.length == 1) {
            x.s = s;
            return x;
          }
        }

        // Estimate result exponent.
        // x^y = 10^e,  where e = y * log10(x)
        // log10(x) = log10(x_significand) + x_exponent
        // log10(x_significand) = ln(x_significand) / ln(10)
        k = mathpow(+x, yn);
        e = k == 0 || !isFinite(k)
          ? mathfloor(yn * (Math.log('0.' + digitsToString(x.d)) / Math.LN10 + x.e + 1))
          : new Ctor(k + '').e;

        // Exponent estimate may be incorrect e.g. x: 0.999999999999999999, y: 2.29, e: 0, r.e: -1.

        // Overflow/underflow?
        if (e > Ctor.maxE + 1 || e < Ctor.minE - 1) return new Ctor(e > 0 ? s / 0 : 0);

        external = false;
        Ctor.rounding = x.s = 1;

        // Estimate the extra guard digits needed to ensure five correct rounding digits from
        // naturalLogarithm(x). Example of failure without these extra digits (precision: 10):
        // new Decimal(2.32456).pow('2087987436534566.46411')
        // should be 1.162377823e+764914905173815, but is 1.162355823e+764914905173815
        k = Math.min(12, (e + '').length);

        // r = x^y = exp(y*ln(x))
        r = naturalExponential(y.times(naturalLogarithm(x, pr + k)), pr);

        // r may be Infinity, e.g. (0.9999999999999999).pow(-1e+40)
        if (r.d) {

          // Truncate to the required precision plus five rounding digits.
          r = finalise(r, pr + 5, 1);

          // If the rounding digits are [49]9999 or [50]0000 increase the precision by 10 and recalculate
          // the result.
          if (checkRoundingDigits(r.d, pr, rm)) {
            e = pr + 10;

            // Truncate to the increased precision plus five rounding digits.
            r = finalise(naturalExponential(y.times(naturalLogarithm(x, e + k)), e), e + 5, 1);

            // Check for 14 nines from the 2nd rounding digit (the first rounding digit may be 4 or 9).
            if (+digitsToString(r.d).slice(pr + 1, pr + 15) + 1 == 1e14) {
              r = finalise(r, pr + 1, 0);
            }
          }
        }

        r.s = s;
        external = true;
        Ctor.rounding = rm;

        return finalise(r, pr, rm);
      };


      /*
       * Return a string representing the value of this Decimal rounded to `sd` significant digits
       * using rounding mode `rounding`.
       *
       * Return exponential notation if `sd` is less than the number of digits necessary to represent
       * the integer part of the value in normal notation.
       *
       * [sd] {number} Significant digits. Integer, 1 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       */
      P.toPrecision = function (sd, rm) {
        var str,
          x = this,
          Ctor = x.constructor;

        if (sd === void 0) {
          str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);
        } else {
          checkInt32(sd, 1, MAX_DIGITS);

          if (rm === void 0) rm = Ctor.rounding;
          else checkInt32(rm, 0, 8);

          x = finalise(new Ctor(x), sd, rm);
          str = finiteToString(x, sd <= x.e || x.e <= Ctor.toExpNeg, sd);
        }

        return x.isNeg() && !x.isZero() ? '-' + str : str;
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal rounded to a maximum of `sd`
       * significant digits using rounding mode `rm`, or to `precision` and `rounding` respectively if
       * omitted.
       *
       * [sd] {number} Significant digits. Integer, 1 to MAX_DIGITS inclusive.
       * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
       *
       * 'toSD() digits out of range: {sd}'
       * 'toSD() digits not an integer: {sd}'
       * 'toSD() rounding mode not an integer: {rm}'
       * 'toSD() rounding mode out of range: {rm}'
       *
       */
      P.toSignificantDigits = P.toSD = function (sd, rm) {
        var x = this,
          Ctor = x.constructor;

        if (sd === void 0) {
          sd = Ctor.precision;
          rm = Ctor.rounding;
        } else {
          checkInt32(sd, 1, MAX_DIGITS);

          if (rm === void 0) rm = Ctor.rounding;
          else checkInt32(rm, 0, 8);
        }

        return finalise(new Ctor(x), sd, rm);
      };


      /*
       * Return a string representing the value of this Decimal.
       *
       * Return exponential notation if this Decimal has a positive exponent equal to or greater than
       * `toExpPos`, or a negative exponent equal to or less than `toExpNeg`.
       *
       */
      P.toString = function () {
        var x = this,
          Ctor = x.constructor,
          str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);

        return x.isNeg() && !x.isZero() ? '-' + str : str;
      };


      /*
       * Return a new Decimal whose value is the value of this Decimal truncated to a whole number.
       *
       */
      P.truncated = P.trunc = function () {
        return finalise(new this.constructor(this), this.e + 1, 1);
      };


      /*
       * Return a string representing the value of this Decimal.
       * Unlike `toString`, negative zero will include the minus sign.
       *
       */
      P.valueOf = P.toJSON = function () {
        var x = this,
          Ctor = x.constructor,
          str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);

        return x.isNeg() ? '-' + str : str;
      };


      // Helper functions for Decimal.prototype (P) and/or Decimal methods, and their callers.


      /*
       *  digitsToString           P.cubeRoot, P.logarithm, P.squareRoot, P.toFraction, P.toPower,
       *                           finiteToString, naturalExponential, naturalLogarithm
       *  checkInt32               P.toDecimalPlaces, P.toExponential, P.toFixed, P.toNearest,
       *                           P.toPrecision, P.toSignificantDigits, toStringBinary, random
       *  checkRoundingDigits      P.logarithm, P.toPower, naturalExponential, naturalLogarithm
       *  convertBase              toStringBinary, parseOther
       *  cos                      P.cos
       *  divide                   P.atanh, P.cubeRoot, P.dividedBy, P.dividedToIntegerBy,
       *                           P.logarithm, P.modulo, P.squareRoot, P.tan, P.tanh, P.toFraction,
       *                           P.toNearest, toStringBinary, naturalExponential, naturalLogarithm,
       *                           taylorSeries, atan2, parseOther
       *  finalise                 P.absoluteValue, P.atan, P.atanh, P.ceil, P.cos, P.cosh,
       *                           P.cubeRoot, P.dividedToIntegerBy, P.floor, P.logarithm, P.minus,
       *                           P.modulo, P.negated, P.plus, P.round, P.sin, P.sinh, P.squareRoot,
       *                           P.tan, P.times, P.toDecimalPlaces, P.toExponential, P.toFixed,
       *                           P.toNearest, P.toPower, P.toPrecision, P.toSignificantDigits,
       *                           P.truncated, divide, getLn10, getPi, naturalExponential,
       *                           naturalLogarithm, ceil, floor, round, trunc
       *  finiteToString           P.toExponential, P.toFixed, P.toPrecision, P.toString, P.valueOf,
       *                           toStringBinary
       *  getBase10Exponent        P.minus, P.plus, P.times, parseOther
       *  getLn10                  P.logarithm, naturalLogarithm
       *  getPi                    P.acos, P.asin, P.atan, toLessThanHalfPi, atan2
       *  getPrecision             P.precision, P.toFraction
       *  getZeroString            digitsToString, finiteToString
       *  intPow                   P.toPower, parseOther
       *  isOdd                    toLessThanHalfPi
       *  maxOrMin                 max, min
       *  naturalExponential       P.naturalExponential, P.toPower
       *  naturalLogarithm         P.acosh, P.asinh, P.atanh, P.logarithm, P.naturalLogarithm,
       *                           P.toPower, naturalExponential
       *  nonFiniteToString        finiteToString, toStringBinary
       *  parseDecimal             Decimal
       *  parseOther               Decimal
       *  sin                      P.sin
       *  taylorSeries             P.cosh, P.sinh, cos, sin
       *  toLessThanHalfPi         P.cos, P.sin
       *  toStringBinary           P.toBinary, P.toHexadecimal, P.toOctal
       *  truncate                 intPow
       *
       *  Throws:                  P.logarithm, P.precision, P.toFraction, checkInt32, getLn10, getPi,
       *                           naturalLogarithm, config, parseOther, random, Decimal
       */


      function digitsToString(d) {
        var i, k, ws,
          indexOfLastWord = d.length - 1,
          str = '',
          w = d[0];

        if (indexOfLastWord > 0) {
          str += w;
          for (i = 1; i < indexOfLastWord; i++) {
            ws = d[i] + '';
            k = LOG_BASE - ws.length;
            if (k) str += getZeroString(k);
            str += ws;
          }

          w = d[i];
          ws = w + '';
          k = LOG_BASE - ws.length;
          if (k) str += getZeroString(k);
        } else if (w === 0) {
          return '0';
        }

        // Remove trailing zeros of last w.
        for (; w % 10 === 0;) w /= 10;

        return str + w;
      }


      function checkInt32(i, min, max) {
        if (i !== ~~i || i < min || i > max) {
          throw Error(invalidArgument + i);
        }
      }


      /*
       * Check 5 rounding digits if `repeating` is null, 4 otherwise.
       * `repeating == null` if caller is `log` or `pow`,
       * `repeating != null` if caller is `naturalLogarithm` or `naturalExponential`.
       */
      function checkRoundingDigits(d, i, rm, repeating) {
        var di, k, r, rd;

        // Get the length of the first word of the array d.
        for (k = d[0]; k >= 10; k /= 10) --i;

        // Is the rounding digit in the first word of d?
        if (--i < 0) {
          i += LOG_BASE;
          di = 0;
        } else {
          di = Math.ceil((i + 1) / LOG_BASE);
          i %= LOG_BASE;
        }

        // i is the index (0 - 6) of the rounding digit.
        // E.g. if within the word 3487563 the first rounding digit is 5,
        // then i = 4, k = 1000, rd = 3487563 % 1000 = 563
        k = mathpow(10, LOG_BASE - i);
        rd = d[di] % k | 0;

        if (repeating == null) {
          if (i < 3) {
            if (i == 0) rd = rd / 100 | 0;
            else if (i == 1) rd = rd / 10 | 0;
            r = rm < 4 && rd == 99999 || rm > 3 && rd == 49999 || rd == 50000 || rd == 0;
          } else {
            r = (rm < 4 && rd + 1 == k || rm > 3 && rd + 1 == k / 2) &&
              (d[di + 1] / k / 100 | 0) == mathpow(10, i - 2) - 1 ||
                (rd == k / 2 || rd == 0) && (d[di + 1] / k / 100 | 0) == 0;
          }
        } else {
          if (i < 4) {
            if (i == 0) rd = rd / 1000 | 0;
            else if (i == 1) rd = rd / 100 | 0;
            else if (i == 2) rd = rd / 10 | 0;
            r = (repeating || rm < 4) && rd == 9999 || !repeating && rm > 3 && rd == 4999;
          } else {
            r = ((repeating || rm < 4) && rd + 1 == k ||
            (!repeating && rm > 3) && rd + 1 == k / 2) &&
              (d[di + 1] / k / 1000 | 0) == mathpow(10, i - 3) - 1;
          }
        }

        return r;
      }


      // Convert string of `baseIn` to an array of numbers of `baseOut`.
      // Eg. convertBase('255', 10, 16) returns [15, 15].
      // Eg. convertBase('ff', 16, 10) returns [2, 5, 5].
      function convertBase(str, baseIn, baseOut) {
        var j,
          arr = [0],
          arrL,
          i = 0,
          strL = str.length;

        for (; i < strL;) {
          for (arrL = arr.length; arrL--;) arr[arrL] *= baseIn;
          arr[0] += NUMERALS.indexOf(str.charAt(i++));
          for (j = 0; j < arr.length; j++) {
            if (arr[j] > baseOut - 1) {
              if (arr[j + 1] === void 0) arr[j + 1] = 0;
              arr[j + 1] += arr[j] / baseOut | 0;
              arr[j] %= baseOut;
            }
          }
        }

        return arr.reverse();
      }


      /*
       * cos(x) = 1 - x^2/2! + x^4/4! - ...
       * |x| < pi/2
       *
       */
      function cosine(Ctor, x) {
        var k, len, y;

        if (x.isZero()) return x;

        // Argument reduction: cos(4x) = 8*(cos^4(x) - cos^2(x)) + 1
        // i.e. cos(x) = 8*(cos^4(x/4) - cos^2(x/4)) + 1

        // Estimate the optimum number of times to use the argument reduction.
        len = x.d.length;
        if (len < 32) {
          k = Math.ceil(len / 3);
          y = (1 / tinyPow(4, k)).toString();
        } else {
          k = 16;
          y = '2.3283064365386962890625e-10';
        }

        Ctor.precision += k;

        x = taylorSeries(Ctor, 1, x.times(y), new Ctor(1));

        // Reverse argument reduction
        for (var i = k; i--;) {
          var cos2x = x.times(x);
          x = cos2x.times(cos2x).minus(cos2x).times(8).plus(1);
        }

        Ctor.precision -= k;

        return x;
      }


      /*
       * Perform division in the specified base.
       */
      var divide = (function () {

        // Assumes non-zero x and k, and hence non-zero result.
        function multiplyInteger(x, k, base) {
          var temp,
            carry = 0,
            i = x.length;

          for (x = x.slice(); i--;) {
            temp = x[i] * k + carry;
            x[i] = temp % base | 0;
            carry = temp / base | 0;
          }

          if (carry) x.unshift(carry);

          return x;
        }

        function compare(a, b, aL, bL) {
          var i, r;

          if (aL != bL) {
            r = aL > bL ? 1 : -1;
          } else {
            for (i = r = 0; i < aL; i++) {
              if (a[i] != b[i]) {
                r = a[i] > b[i] ? 1 : -1;
                break;
              }
            }
          }

          return r;
        }

        function subtract(a, b, aL, base) {
          var i = 0;

          // Subtract b from a.
          for (; aL--;) {
            a[aL] -= i;
            i = a[aL] < b[aL] ? 1 : 0;
            a[aL] = i * base + a[aL] - b[aL];
          }

          // Remove leading zeros.
          for (; !a[0] && a.length > 1;) a.shift();
        }

        return function (x, y, pr, rm, dp, base) {
          var cmp, e, i, k, logBase, more, prod, prodL, q, qd, rem, remL, rem0, sd, t, xi, xL, yd0,
            yL, yz,
            Ctor = x.constructor,
            sign = x.s == y.s ? 1 : -1,
            xd = x.d,
            yd = y.d;

          // Either NaN, Infinity or 0?
          if (!xd || !xd[0] || !yd || !yd[0]) {

            return new Ctor(// Return NaN if either NaN, or both Infinity or 0.
              !x.s || !y.s || (xd ? yd && xd[0] == yd[0] : !yd) ? NaN :

              // Return ±0 if x is 0 or y is ±Infinity, or return ±Infinity as y is 0.
              xd && xd[0] == 0 || !yd ? sign * 0 : sign / 0);
          }

          if (base) {
            logBase = 1;
            e = x.e - y.e;
          } else {
            base = BASE;
            logBase = LOG_BASE;
            e = mathfloor(x.e / logBase) - mathfloor(y.e / logBase);
          }

          yL = yd.length;
          xL = xd.length;
          q = new Ctor(sign);
          qd = q.d = [];

          // Result exponent may be one less than e.
          // The digit array of a Decimal from toStringBinary may have trailing zeros.
          for (i = 0; yd[i] == (xd[i] || 0); i++);

          if (yd[i] > (xd[i] || 0)) e--;

          if (pr == null) {
            sd = pr = Ctor.precision;
            rm = Ctor.rounding;
          } else if (dp) {
            sd = pr + (x.e - y.e) + 1;
          } else {
            sd = pr;
          }

          if (sd < 0) {
            qd.push(1);
            more = true;
          } else {

            // Convert precision in number of base 10 digits to base 1e7 digits.
            sd = sd / logBase + 2 | 0;
            i = 0;

            // divisor < 1e7
            if (yL == 1) {
              k = 0;
              yd = yd[0];
              sd++;

              // k is the carry.
              for (; (i < xL || k) && sd--; i++) {
                t = k * base + (xd[i] || 0);
                qd[i] = t / yd | 0;
                k = t % yd | 0;
              }

              more = k || i < xL;

            // divisor >= 1e7
            } else {

              // Normalise xd and yd so highest order digit of yd is >= base/2
              k = base / (yd[0] + 1) | 0;

              if (k > 1) {
                yd = multiplyInteger(yd, k, base);
                xd = multiplyInteger(xd, k, base);
                yL = yd.length;
                xL = xd.length;
              }

              xi = yL;
              rem = xd.slice(0, yL);
              remL = rem.length;

              // Add zeros to make remainder as long as divisor.
              for (; remL < yL;) rem[remL++] = 0;

              yz = yd.slice();
              yz.unshift(0);
              yd0 = yd[0];

              if (yd[1] >= base / 2) ++yd0;

              do {
                k = 0;

                // Compare divisor and remainder.
                cmp = compare(yd, rem, yL, remL);

                // If divisor < remainder.
                if (cmp < 0) {

                  // Calculate trial digit, k.
                  rem0 = rem[0];
                  if (yL != remL) rem0 = rem0 * base + (rem[1] || 0);

                  // k will be how many times the divisor goes into the current remainder.
                  k = rem0 / yd0 | 0;

                  //  Algorithm:
                  //  1. product = divisor * trial digit (k)
                  //  2. if product > remainder: product -= divisor, k--
                  //  3. remainder -= product
                  //  4. if product was < remainder at 2:
                  //    5. compare new remainder and divisor
                  //    6. If remainder > divisor: remainder -= divisor, k++

                  if (k > 1) {
                    if (k >= base) k = base - 1;

                    // product = divisor * trial digit.
                    prod = multiplyInteger(yd, k, base);
                    prodL = prod.length;
                    remL = rem.length;

                    // Compare product and remainder.
                    cmp = compare(prod, rem, prodL, remL);

                    // product > remainder.
                    if (cmp == 1) {
                      k--;

                      // Subtract divisor from product.
                      subtract(prod, yL < prodL ? yz : yd, prodL, base);
                    }
                  } else {

                    // cmp is -1.
                    // If k is 0, there is no need to compare yd and rem again below, so change cmp to 1
                    // to avoid it. If k is 1 there is a need to compare yd and rem again below.
                    if (k == 0) cmp = k = 1;
                    prod = yd.slice();
                  }

                  prodL = prod.length;
                  if (prodL < remL) prod.unshift(0);

                  // Subtract product from remainder.
                  subtract(rem, prod, remL, base);

                  // If product was < previous remainder.
                  if (cmp == -1) {
                    remL = rem.length;

                    // Compare divisor and new remainder.
                    cmp = compare(yd, rem, yL, remL);

                    // If divisor < new remainder, subtract divisor from remainder.
                    if (cmp < 1) {
                      k++;

                      // Subtract divisor from remainder.
                      subtract(rem, yL < remL ? yz : yd, remL, base);
                    }
                  }

                  remL = rem.length;
                } else if (cmp === 0) {
                  k++;
                  rem = [0];
                }    // if cmp === 1, k will be 0

                // Add the next digit, k, to the result array.
                qd[i++] = k;

                // Update the remainder.
                if (cmp && rem[0]) {
                  rem[remL++] = xd[xi] || 0;
                } else {
                  rem = [xd[xi]];
                  remL = 1;
                }

              } while ((xi++ < xL || rem[0] !== void 0) && sd--);

              more = rem[0] !== void 0;
            }

            // Leading zero?
            if (!qd[0]) qd.shift();
          }

          // logBase is 1 when divide is being used for base conversion.
          if (logBase == 1) {
            q.e = e;
            inexact = more;
          } else {

            // To calculate q.e, first get the number of digits of qd[0].
            for (i = 1, k = qd[0]; k >= 10; k /= 10) i++;
            q.e = i + e * logBase - 1;

            finalise(q, dp ? pr + q.e + 1 : pr, rm, more);
          }

          return q;
        };
      })();


      /*
       * Round `x` to `sd` significant digits using rounding mode `rm`.
       * Check for over/under-flow.
       */
       function finalise(x, sd, rm, isTruncated) {
        var digits, i, j, k, rd, roundUp, w, xd, xdi,
          Ctor = x.constructor;

        // Don't round if sd is null or undefined.
        out: if (sd != null) {
          xd = x.d;

          // Infinity/NaN.
          if (!xd) return x;

          // rd: the rounding digit, i.e. the digit after the digit that may be rounded up.
          // w: the word of xd containing rd, a base 1e7 number.
          // xdi: the index of w within xd.
          // digits: the number of digits of w.
          // i: what would be the index of rd within w if all the numbers were 7 digits long (i.e. if
          // they had leading zeros)
          // j: if > 0, the actual index of rd within w (if < 0, rd is a leading zero).

          // Get the length of the first word of the digits array xd.
          for (digits = 1, k = xd[0]; k >= 10; k /= 10) digits++;
          i = sd - digits;

          // Is the rounding digit in the first word of xd?
          if (i < 0) {
            i += LOG_BASE;
            j = sd;
            w = xd[xdi = 0];

            // Get the rounding digit at index j of w.
            rd = w / mathpow(10, digits - j - 1) % 10 | 0;
          } else {
            xdi = Math.ceil((i + 1) / LOG_BASE);
            k = xd.length;
            if (xdi >= k) {
              if (isTruncated) {

                // Needed by `naturalExponential`, `naturalLogarithm` and `squareRoot`.
                for (; k++ <= xdi;) xd.push(0);
                w = rd = 0;
                digits = 1;
                i %= LOG_BASE;
                j = i - LOG_BASE + 1;
              } else {
                break out;
              }
            } else {
              w = k = xd[xdi];

              // Get the number of digits of w.
              for (digits = 1; k >= 10; k /= 10) digits++;

              // Get the index of rd within w.
              i %= LOG_BASE;

              // Get the index of rd within w, adjusted for leading zeros.
              // The number of leading zeros of w is given by LOG_BASE - digits.
              j = i - LOG_BASE + digits;

              // Get the rounding digit at index j of w.
              rd = j < 0 ? 0 : w / mathpow(10, digits - j - 1) % 10 | 0;
            }
          }

          // Are there any non-zero digits after the rounding digit?
          isTruncated = isTruncated || sd < 0 ||
            xd[xdi + 1] !== void 0 || (j < 0 ? w : w % mathpow(10, digits - j - 1));

          // The expression `w % mathpow(10, digits - j - 1)` returns all the digits of w to the right
          // of the digit at (left-to-right) index j, e.g. if w is 908714 and j is 2, the expression
          // will give 714.

          roundUp = rm < 4
            ? (rd || isTruncated) && (rm == 0 || rm == (x.s < 0 ? 3 : 2))
            : rd > 5 || rd == 5 && (rm == 4 || isTruncated || rm == 6 &&

              // Check whether the digit to the left of the rounding digit is odd.
              ((i > 0 ? j > 0 ? w / mathpow(10, digits - j) : 0 : xd[xdi - 1]) % 10) & 1 ||
                rm == (x.s < 0 ? 8 : 7));

          if (sd < 1 || !xd[0]) {
            xd.length = 0;
            if (roundUp) {

              // Convert sd to decimal places.
              sd -= x.e + 1;

              // 1, 0.1, 0.01, 0.001, 0.0001 etc.
              xd[0] = mathpow(10, (LOG_BASE - sd % LOG_BASE) % LOG_BASE);
              x.e = -sd || 0;
            } else {

              // Zero.
              xd[0] = x.e = 0;
            }

            return x;
          }

          // Remove excess digits.
          if (i == 0) {
            xd.length = xdi;
            k = 1;
            xdi--;
          } else {
            xd.length = xdi + 1;
            k = mathpow(10, LOG_BASE - i);

            // E.g. 56700 becomes 56000 if 7 is the rounding digit.
            // j > 0 means i > number of leading zeros of w.
            xd[xdi] = j > 0 ? (w / mathpow(10, digits - j) % mathpow(10, j) | 0) * k : 0;
          }

          if (roundUp) {
            for (;;) {

              // Is the digit to be rounded up in the first word of xd?
              if (xdi == 0) {

                // i will be the length of xd[0] before k is added.
                for (i = 1, j = xd[0]; j >= 10; j /= 10) i++;
                j = xd[0] += k;
                for (k = 1; j >= 10; j /= 10) k++;

                // if i != k the length has increased.
                if (i != k) {
                  x.e++;
                  if (xd[0] == BASE) xd[0] = 1;
                }

                break;
              } else {
                xd[xdi] += k;
                if (xd[xdi] != BASE) break;
                xd[xdi--] = 0;
                k = 1;
              }
            }
          }

          // Remove trailing zeros.
          for (i = xd.length; xd[--i] === 0;) xd.pop();
        }

        if (external) {

          // Overflow?
          if (x.e > Ctor.maxE) {

            // Infinity.
            x.d = null;
            x.e = NaN;

          // Underflow?
          } else if (x.e < Ctor.minE) {

            // Zero.
            x.e = 0;
            x.d = [0];
            // Ctor.underflow = true;
          } // else Ctor.underflow = false;
        }

        return x;
      }


      function finiteToString(x, isExp, sd) {
        if (!x.isFinite()) return nonFiniteToString(x);
        var k,
          e = x.e,
          str = digitsToString(x.d),
          len = str.length;

        if (isExp) {
          if (sd && (k = sd - len) > 0) {
            str = str.charAt(0) + '.' + str.slice(1) + getZeroString(k);
          } else if (len > 1) {
            str = str.charAt(0) + '.' + str.slice(1);
          }

          str = str + (x.e < 0 ? 'e' : 'e+') + x.e;
        } else if (e < 0) {
          str = '0.' + getZeroString(-e - 1) + str;
          if (sd && (k = sd - len) > 0) str += getZeroString(k);
        } else if (e >= len) {
          str += getZeroString(e + 1 - len);
          if (sd && (k = sd - e - 1) > 0) str = str + '.' + getZeroString(k);
        } else {
          if ((k = e + 1) < len) str = str.slice(0, k) + '.' + str.slice(k);
          if (sd && (k = sd - len) > 0) {
            if (e + 1 === len) str += '.';
            str += getZeroString(k);
          }
        }

        return str;
      }


      // Calculate the base 10 exponent from the base 1e7 exponent.
      function getBase10Exponent(digits, e) {
        var w = digits[0];

        // Add the number of digits of the first word of the digits array.
        for ( e *= LOG_BASE; w >= 10; w /= 10) e++;
        return e;
      }


      function getLn10(Ctor, sd, pr) {
        if (sd > LN10_PRECISION) {

          // Reset global state in case the exception is caught.
          external = true;
          if (pr) Ctor.precision = pr;
          throw Error(precisionLimitExceeded);
        }
        return finalise(new Ctor(LN10), sd, 1, true);
      }


      function getPi(Ctor, sd, rm) {
        if (sd > PI_PRECISION) throw Error(precisionLimitExceeded);
        return finalise(new Ctor(PI), sd, rm, true);
      }


      function getPrecision(digits) {
        var w = digits.length - 1,
          len = w * LOG_BASE + 1;

        w = digits[w];

        // If non-zero...
        if (w) {

          // Subtract the number of trailing zeros of the last word.
          for (; w % 10 == 0; w /= 10) len--;

          // Add the number of digits of the first word.
          for (w = digits[0]; w >= 10; w /= 10) len++;
        }

        return len;
      }


      function getZeroString(k) {
        var zs = '';
        for (; k--;) zs += '0';
        return zs;
      }


      /*
       * Return a new Decimal whose value is the value of Decimal `x` to the power `n`, where `n` is an
       * integer of type number.
       *
       * Implements 'exponentiation by squaring'. Called by `pow` and `parseOther`.
       *
       */
      function intPow(Ctor, x, n, pr) {
        var isTruncated,
          r = new Ctor(1),

          // Max n of 9007199254740991 takes 53 loop iterations.
          // Maximum digits array length; leaves [28, 34] guard digits.
          k = Math.ceil(pr / LOG_BASE + 4);

        external = false;

        for (;;) {
          if (n % 2) {
            r = r.times(x);
            if (truncate(r.d, k)) isTruncated = true;
          }

          n = mathfloor(n / 2);
          if (n === 0) {

            // To ensure correct rounding when r.d is truncated, increment the last word if it is zero.
            n = r.d.length - 1;
            if (isTruncated && r.d[n] === 0) ++r.d[n];
            break;
          }

          x = x.times(x);
          truncate(x.d, k);
        }

        external = true;

        return r;
      }


      function isOdd(n) {
        return n.d[n.d.length - 1] & 1;
      }


      /*
       * Handle `max` and `min`. `ltgt` is 'lt' or 'gt'.
       */
      function maxOrMin(Ctor, args, ltgt) {
        var y,
          x = new Ctor(args[0]),
          i = 0;

        for (; ++i < args.length;) {
          y = new Ctor(args[i]);
          if (!y.s) {
            x = y;
            break;
          } else if (x[ltgt](y)) {
            x = y;
          }
        }

        return x;
      }


      /*
       * Return a new Decimal whose value is the natural exponential of `x` rounded to `sd` significant
       * digits.
       *
       * Taylor/Maclaurin series.
       *
       * exp(x) = x^0/0! + x^1/1! + x^2/2! + x^3/3! + ...
       *
       * Argument reduction:
       *   Repeat x = x / 32, k += 5, until |x| < 0.1
       *   exp(x) = exp(x / 2^k)^(2^k)
       *
       * Previously, the argument was initially reduced by
       * exp(x) = exp(r) * 10^k  where r = x - k * ln10, k = floor(x / ln10)
       * to first put r in the range [0, ln10], before dividing by 32 until |x| < 0.1, but this was
       * found to be slower than just dividing repeatedly by 32 as above.
       *
       * Max integer argument: exp('20723265836946413') = 6.3e+9000000000000000
       * Min integer argument: exp('-20723265836946411') = 1.2e-9000000000000000
       * (Math object integer min/max: Math.exp(709) = 8.2e+307, Math.exp(-745) = 5e-324)
       *
       *  exp(Infinity)  = Infinity
       *  exp(-Infinity) = 0
       *  exp(NaN)       = NaN
       *  exp(±0)        = 1
       *
       *  exp(x) is non-terminating for any finite, non-zero x.
       *
       *  The result will always be correctly rounded.
       *
       */
      function naturalExponential(x, sd) {
        var denominator, guard, j, pow, sum, t, wpr,
          rep = 0,
          i = 0,
          k = 0,
          Ctor = x.constructor,
          rm = Ctor.rounding,
          pr = Ctor.precision;

        // 0/NaN/Infinity?
        if (!x.d || !x.d[0] || x.e > 17) {

          return new Ctor(x.d
            ? !x.d[0] ? 1 : x.s < 0 ? 0 : 1 / 0
            : x.s ? x.s < 0 ? 0 : x : 0 / 0);
        }

        if (sd == null) {
          external = false;
          wpr = pr;
        } else {
          wpr = sd;
        }

        t = new Ctor(0.03125);

        // while abs(x) >= 0.1
        while (x.e > -2) {

          // x = x / 2^5
          x = x.times(t);
          k += 5;
        }

        // Use 2 * log10(2^k) + 5 (empirically derived) to estimate the increase in precision
        // necessary to ensure the first 4 rounding digits are correct.
        guard = Math.log(mathpow(2, k)) / Math.LN10 * 2 + 5 | 0;
        wpr += guard;
        denominator = pow = sum = new Ctor(1);
        Ctor.precision = wpr;

        for (;;) {
          pow = finalise(pow.times(x), wpr, 1);
          denominator = denominator.times(++i);
          t = sum.plus(divide(pow, denominator, wpr, 1));

          if (digitsToString(t.d).slice(0, wpr) === digitsToString(sum.d).slice(0, wpr)) {
            j = k;
            while (j--) sum = finalise(sum.times(sum), wpr, 1);

            // Check to see if the first 4 rounding digits are [49]999.
            // If so, repeat the summation with a higher precision, otherwise
            // e.g. with precision: 18, rounding: 1
            // exp(18.404272462595034083567793919843761) = 98372560.1229999999 (should be 98372560.123)
            // `wpr - guard` is the index of first rounding digit.
            if (sd == null) {

              if (rep < 3 && checkRoundingDigits(sum.d, wpr - guard, rm, rep)) {
                Ctor.precision = wpr += 10;
                denominator = pow = t = new Ctor(1);
                i = 0;
                rep++;
              } else {
                return finalise(sum, Ctor.precision = pr, rm, external = true);
              }
            } else {
              Ctor.precision = pr;
              return sum;
            }
          }

          sum = t;
        }
      }


      /*
       * Return a new Decimal whose value is the natural logarithm of `x` rounded to `sd` significant
       * digits.
       *
       *  ln(-n)        = NaN
       *  ln(0)         = -Infinity
       *  ln(-0)        = -Infinity
       *  ln(1)         = 0
       *  ln(Infinity)  = Infinity
       *  ln(-Infinity) = NaN
       *  ln(NaN)       = NaN
       *
       *  ln(n) (n != 1) is non-terminating.
       *
       */
      function naturalLogarithm(y, sd) {
        var c, c0, denominator, e, numerator, rep, sum, t, wpr, x1, x2,
          n = 1,
          guard = 10,
          x = y,
          xd = x.d,
          Ctor = x.constructor,
          rm = Ctor.rounding,
          pr = Ctor.precision;

        // Is x negative or Infinity, NaN, 0 or 1?
        if (x.s < 0 || !xd || !xd[0] || !x.e && xd[0] == 1 && xd.length == 1) {
          return new Ctor(xd && !xd[0] ? -1 / 0 : x.s != 1 ? NaN : xd ? 0 : x);
        }

        if (sd == null) {
          external = false;
          wpr = pr;
        } else {
          wpr = sd;
        }

        Ctor.precision = wpr += guard;
        c = digitsToString(xd);
        c0 = c.charAt(0);

        if (Math.abs(e = x.e) < 1.5e15) {

          // Argument reduction.
          // The series converges faster the closer the argument is to 1, so using
          // ln(a^b) = b * ln(a),   ln(a) = ln(a^b) / b
          // multiply the argument by itself until the leading digits of the significand are 7, 8, 9,
          // 10, 11, 12 or 13, recording the number of multiplications so the sum of the series can
          // later be divided by this number, then separate out the power of 10 using
          // ln(a*10^b) = ln(a) + b*ln(10).

          // max n is 21 (gives 0.9, 1.0 or 1.1) (9e15 / 21 = 4.2e14).
          //while (c0 < 9 && c0 != 1 || c0 == 1 && c.charAt(1) > 1) {
          // max n is 6 (gives 0.7 - 1.3)
          while (c0 < 7 && c0 != 1 || c0 == 1 && c.charAt(1) > 3) {
            x = x.times(y);
            c = digitsToString(x.d);
            c0 = c.charAt(0);
            n++;
          }

          e = x.e;

          if (c0 > 1) {
            x = new Ctor('0.' + c);
            e++;
          } else {
            x = new Ctor(c0 + '.' + c.slice(1));
          }
        } else {

          // The argument reduction method above may result in overflow if the argument y is a massive
          // number with exponent >= 1500000000000000 (9e15 / 6 = 1.5e15), so instead recall this
          // function using ln(x*10^e) = ln(x) + e*ln(10).
          t = getLn10(Ctor, wpr + 2, pr).times(e + '');
          x = naturalLogarithm(new Ctor(c0 + '.' + c.slice(1)), wpr - guard).plus(t);
          Ctor.precision = pr;

          return sd == null ? finalise(x, pr, rm, external = true) : x;
        }

        // x1 is x reduced to a value near 1.
        x1 = x;

        // Taylor series.
        // ln(y) = ln((1 + x)/(1 - x)) = 2(x + x^3/3 + x^5/5 + x^7/7 + ...)
        // where x = (y - 1)/(y + 1)    (|x| < 1)
        sum = numerator = x = divide(x.minus(1), x.plus(1), wpr, 1);
        x2 = finalise(x.times(x), wpr, 1);
        denominator = 3;

        for (;;) {
          numerator = finalise(numerator.times(x2), wpr, 1);
          t = sum.plus(divide(numerator, new Ctor(denominator), wpr, 1));

          if (digitsToString(t.d).slice(0, wpr) === digitsToString(sum.d).slice(0, wpr)) {
            sum = sum.times(2);

            // Reverse the argument reduction. Check that e is not 0 because, besides preventing an
            // unnecessary calculation, -0 + 0 = +0 and to ensure correct rounding -0 needs to stay -0.
            if (e !== 0) sum = sum.plus(getLn10(Ctor, wpr + 2, pr).times(e + ''));
            sum = divide(sum, new Ctor(n), wpr, 1);

            // Is rm > 3 and the first 4 rounding digits 4999, or rm < 4 (or the summation has
            // been repeated previously) and the first 4 rounding digits 9999?
            // If so, restart the summation with a higher precision, otherwise
            // e.g. with precision: 12, rounding: 1
            // ln(135520028.6126091714265381533) = 18.7246299999 when it should be 18.72463.
            // `wpr - guard` is the index of first rounding digit.
            if (sd == null) {
              if (checkRoundingDigits(sum.d, wpr - guard, rm, rep)) {
                Ctor.precision = wpr += guard;
                t = numerator = x = divide(x1.minus(1), x1.plus(1), wpr, 1);
                x2 = finalise(x.times(x), wpr, 1);
                denominator = rep = 1;
              } else {
                return finalise(sum, Ctor.precision = pr, rm, external = true);
              }
            } else {
              Ctor.precision = pr;
              return sum;
            }
          }

          sum = t;
          denominator += 2;
        }
      }


      // ±Infinity, NaN.
      function nonFiniteToString(x) {
        // Unsigned.
        return String(x.s * x.s / 0);
      }


      /*
       * Parse the value of a new Decimal `x` from string `str`.
       */
      function parseDecimal(x, str) {
        var e, i, len;

        // Decimal point?
        if ((e = str.indexOf('.')) > -1) str = str.replace('.', '');

        // Exponential form?
        if ((i = str.search(/e/i)) > 0) {

          // Determine exponent.
          if (e < 0) e = i;
          e += +str.slice(i + 1);
          str = str.substring(0, i);
        } else if (e < 0) {

          // Integer.
          e = str.length;
        }

        // Determine leading zeros.
        for (i = 0; str.charCodeAt(i) === 48; i++);

        // Determine trailing zeros.
        for (len = str.length; str.charCodeAt(len - 1) === 48; --len);
        str = str.slice(i, len);

        if (str) {
          len -= i;
          x.e = e = e - i - 1;
          x.d = [];

          // Transform base

          // e is the base 10 exponent.
          // i is where to slice str to get the first word of the digits array.
          i = (e + 1) % LOG_BASE;
          if (e < 0) i += LOG_BASE;

          if (i < len) {
            if (i) x.d.push(+str.slice(0, i));
            for (len -= LOG_BASE; i < len;) x.d.push(+str.slice(i, i += LOG_BASE));
            str = str.slice(i);
            i = LOG_BASE - str.length;
          } else {
            i -= len;
          }

          for (; i--;) str += '0';
          x.d.push(+str);

          if (external) {

            // Overflow?
            if (x.e > x.constructor.maxE) {

              // Infinity.
              x.d = null;
              x.e = NaN;

            // Underflow?
            } else if (x.e < x.constructor.minE) {

              // Zero.
              x.e = 0;
              x.d = [0];
              // x.constructor.underflow = true;
            } // else x.constructor.underflow = false;
          }
        } else {

          // Zero.
          x.e = 0;
          x.d = [0];
        }

        return x;
      }


      /*
       * Parse the value of a new Decimal `x` from a string `str`, which is not a decimal value.
       */
      function parseOther(x, str) {
        var base, Ctor, divisor, i, isFloat, len, p, xd, xe;

        if (str.indexOf('_') > -1) {
          str = str.replace(/(\d)_(?=\d)/g, '$1');
          if (isDecimal.test(str)) return parseDecimal(x, str);
        } else if (str === 'Infinity' || str === 'NaN') {
          if (!+str) x.s = NaN;
          x.e = NaN;
          x.d = null;
          return x;
        }

        if (isHex.test(str))  {
          base = 16;
          str = str.toLowerCase();
        } else if (isBinary.test(str))  {
          base = 2;
        } else if (isOctal.test(str))  {
          base = 8;
        } else {
          throw Error(invalidArgument + str);
        }

        // Is there a binary exponent part?
        i = str.search(/p/i);

        if (i > 0) {
          p = +str.slice(i + 1);
          str = str.substring(2, i);
        } else {
          str = str.slice(2);
        }

        // Convert `str` as an integer then divide the result by `base` raised to a power such that the
        // fraction part will be restored.
        i = str.indexOf('.');
        isFloat = i >= 0;
        Ctor = x.constructor;

        if (isFloat) {
          str = str.replace('.', '');
          len = str.length;
          i = len - i;

          // log[10](16) = 1.2041... , log[10](88) = 1.9444....
          divisor = intPow(Ctor, new Ctor(base), i, i * 2);
        }

        xd = convertBase(str, base, BASE);
        xe = xd.length - 1;

        // Remove trailing zeros.
        for (i = xe; xd[i] === 0; --i) xd.pop();
        if (i < 0) return new Ctor(x.s * 0);
        x.e = getBase10Exponent(xd, xe);
        x.d = xd;
        external = false;

        // At what precision to perform the division to ensure exact conversion?
        // maxDecimalIntegerPartDigitCount = ceil(log[10](b) * otherBaseIntegerPartDigitCount)
        // log[10](2) = 0.30103, log[10](8) = 0.90309, log[10](16) = 1.20412
        // E.g. ceil(1.2 * 3) = 4, so up to 4 decimal digits are needed to represent 3 hex int digits.
        // maxDecimalFractionPartDigitCount = {Hex:4|Oct:3|Bin:1} * otherBaseFractionPartDigitCount
        // Therefore using 4 * the number of digits of str will always be enough.
        if (isFloat) x = divide(x, divisor, len * 4);

        // Multiply by the binary exponent part if present.
        if (p) x = x.times(Math.abs(p) < 54 ? mathpow(2, p) : Decimal.pow(2, p));
        external = true;

        return x;
      }


      /*
       * sin(x) = x - x^3/3! + x^5/5! - ...
       * |x| < pi/2
       *
       */
      function sine(Ctor, x) {
        var k,
          len = x.d.length;

        if (len < 3) {
          return x.isZero() ? x : taylorSeries(Ctor, 2, x, x);
        }

        // Argument reduction: sin(5x) = 16*sin^5(x) - 20*sin^3(x) + 5*sin(x)
        // i.e. sin(x) = 16*sin^5(x/5) - 20*sin^3(x/5) + 5*sin(x/5)
        // and  sin(x) = sin(x/5)(5 + sin^2(x/5)(16sin^2(x/5) - 20))

        // Estimate the optimum number of times to use the argument reduction.
        k = 1.4 * Math.sqrt(len);
        k = k > 16 ? 16 : k | 0;

        x = x.times(1 / tinyPow(5, k));
        x = taylorSeries(Ctor, 2, x, x);

        // Reverse argument reduction
        var sin2_x,
          d5 = new Ctor(5),
          d16 = new Ctor(16),
          d20 = new Ctor(20);
        for (; k--;) {
          sin2_x = x.times(x);
          x = x.times(d5.plus(sin2_x.times(d16.times(sin2_x).minus(d20))));
        }

        return x;
      }


      // Calculate Taylor series for `cos`, `cosh`, `sin` and `sinh`.
      function taylorSeries(Ctor, n, x, y, isHyperbolic) {
        var j, t, u, x2,
          pr = Ctor.precision,
          k = Math.ceil(pr / LOG_BASE);

        external = false;
        x2 = x.times(x);
        u = new Ctor(y);

        for (;;) {
          t = divide(u.times(x2), new Ctor(n++ * n++), pr, 1);
          u = isHyperbolic ? y.plus(t) : y.minus(t);
          y = divide(t.times(x2), new Ctor(n++ * n++), pr, 1);
          t = u.plus(y);

          if (t.d[k] !== void 0) {
            for (j = k; t.d[j] === u.d[j] && j--;);
            if (j == -1) break;
          }

          j = u;
          u = y;
          y = t;
          t = j;
        }

        external = true;
        t.d.length = k + 1;

        return t;
      }


      // Exponent e must be positive and non-zero.
      function tinyPow(b, e) {
        var n = b;
        while (--e) n *= b;
        return n;
      }


      // Return the absolute value of `x` reduced to less than or equal to half pi.
      function toLessThanHalfPi(Ctor, x) {
        var t,
          isNeg = x.s < 0,
          pi = getPi(Ctor, Ctor.precision, 1),
          halfPi = pi.times(0.5);

        x = x.abs();

        if (x.lte(halfPi)) {
          quadrant = isNeg ? 4 : 1;
          return x;
        }

        t = x.divToInt(pi);

        if (t.isZero()) {
          quadrant = isNeg ? 3 : 2;
        } else {
          x = x.minus(t.times(pi));

          // 0 <= x < pi
          if (x.lte(halfPi)) {
            quadrant = isOdd(t) ? (isNeg ? 2 : 3) : (isNeg ? 4 : 1);
            return x;
          }

          quadrant = isOdd(t) ? (isNeg ? 1 : 4) : (isNeg ? 3 : 2);
        }

        return x.minus(pi).abs();
      }


      /*
       * Return the value of Decimal `x` as a string in base `baseOut`.
       *
       * If the optional `sd` argument is present include a binary exponent suffix.
       */
      function toStringBinary(x, baseOut, sd, rm) {
        var base, e, i, k, len, roundUp, str, xd, y,
          Ctor = x.constructor,
          isExp = sd !== void 0;

        if (isExp) {
          checkInt32(sd, 1, MAX_DIGITS);
          if (rm === void 0) rm = Ctor.rounding;
          else checkInt32(rm, 0, 8);
        } else {
          sd = Ctor.precision;
          rm = Ctor.rounding;
        }

        if (!x.isFinite()) {
          str = nonFiniteToString(x);
        } else {
          str = finiteToString(x);
          i = str.indexOf('.');

          // Use exponential notation according to `toExpPos` and `toExpNeg`? No, but if required:
          // maxBinaryExponent = floor((decimalExponent + 1) * log[2](10))
          // minBinaryExponent = floor(decimalExponent * log[2](10))
          // log[2](10) = 3.321928094887362347870319429489390175864

          if (isExp) {
            base = 2;
            if (baseOut == 16) {
              sd = sd * 4 - 3;
            } else if (baseOut == 8) {
              sd = sd * 3 - 2;
            }
          } else {
            base = baseOut;
          }

          // Convert the number as an integer then divide the result by its base raised to a power such
          // that the fraction part will be restored.

          // Non-integer.
          if (i >= 0) {
            str = str.replace('.', '');
            y = new Ctor(1);
            y.e = str.length - i;
            y.d = convertBase(finiteToString(y), 10, base);
            y.e = y.d.length;
          }

          xd = convertBase(str, 10, base);
          e = len = xd.length;

          // Remove trailing zeros.
          for (; xd[--len] == 0;) xd.pop();

          if (!xd[0]) {
            str = isExp ? '0p+0' : '0';
          } else {
            if (i < 0) {
              e--;
            } else {
              x = new Ctor(x);
              x.d = xd;
              x.e = e;
              x = divide(x, y, sd, rm, 0, base);
              xd = x.d;
              e = x.e;
              roundUp = inexact;
            }

            // The rounding digit, i.e. the digit after the digit that may be rounded up.
            i = xd[sd];
            k = base / 2;
            roundUp = roundUp || xd[sd + 1] !== void 0;

            roundUp = rm < 4
              ? (i !== void 0 || roundUp) && (rm === 0 || rm === (x.s < 0 ? 3 : 2))
              : i > k || i === k && (rm === 4 || roundUp || rm === 6 && xd[sd - 1] & 1 ||
                rm === (x.s < 0 ? 8 : 7));

            xd.length = sd;

            if (roundUp) {

              // Rounding up may mean the previous digit has to be rounded up and so on.
              for (; ++xd[--sd] > base - 1;) {
                xd[sd] = 0;
                if (!sd) {
                  ++e;
                  xd.unshift(1);
                }
              }
            }

            // Determine trailing zeros.
            for (len = xd.length; !xd[len - 1]; --len);

            // E.g. [4, 11, 15] becomes 4bf.
            for (i = 0, str = ''; i < len; i++) str += NUMERALS.charAt(xd[i]);

            // Add binary exponent suffix?
            if (isExp) {
              if (len > 1) {
                if (baseOut == 16 || baseOut == 8) {
                  i = baseOut == 16 ? 4 : 3;
                  for (--len; len % i; len++) str += '0';
                  xd = convertBase(str, base, baseOut);
                  for (len = xd.length; !xd[len - 1]; --len);

                  // xd[0] will always be be 1
                  for (i = 1, str = '1.'; i < len; i++) str += NUMERALS.charAt(xd[i]);
                } else {
                  str = str.charAt(0) + '.' + str.slice(1);
                }
              }

              str =  str + (e < 0 ? 'p' : 'p+') + e;
            } else if (e < 0) {
              for (; ++e;) str = '0' + str;
              str = '0.' + str;
            } else {
              if (++e > len) for (e -= len; e-- ;) str += '0';
              else if (e < len) str = str.slice(0, e) + '.' + str.slice(e);
            }
          }

          str = (baseOut == 16 ? '0x' : baseOut == 2 ? '0b' : baseOut == 8 ? '0o' : '') + str;
        }

        return x.s < 0 ? '-' + str : str;
      }


      // Does not strip trailing zeros.
      function truncate(arr, len) {
        if (arr.length > len) {
          arr.length = len;
          return true;
        }
      }


      // Decimal methods


      /*
       *  abs
       *  acos
       *  acosh
       *  add
       *  asin
       *  asinh
       *  atan
       *  atanh
       *  atan2
       *  cbrt
       *  ceil
       *  clamp
       *  clone
       *  config
       *  cos
       *  cosh
       *  div
       *  exp
       *  floor
       *  hypot
       *  ln
       *  log
       *  log2
       *  log10
       *  max
       *  min
       *  mod
       *  mul
       *  pow
       *  random
       *  round
       *  set
       *  sign
       *  sin
       *  sinh
       *  sqrt
       *  sub
       *  sum
       *  tan
       *  tanh
       *  trunc
       */


      /*
       * Return a new Decimal whose value is the absolute value of `x`.
       *
       * x {number|string|Decimal}
       *
       */
      function abs(x) {
        return new this(x).abs();
      }


      /*
       * Return a new Decimal whose value is the arccosine in radians of `x`.
       *
       * x {number|string|Decimal}
       *
       */
      function acos(x) {
        return new this(x).acos();
      }


      /*
       * Return a new Decimal whose value is the inverse of the hyperbolic cosine of `x`, rounded to
       * `precision` significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function acosh(x) {
        return new this(x).acosh();
      }


      /*
       * Return a new Decimal whose value is the sum of `x` and `y`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       * y {number|string|Decimal}
       *
       */
      function add(x, y) {
        return new this(x).plus(y);
      }


      /*
       * Return a new Decimal whose value is the arcsine in radians of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       *
       */
      function asin(x) {
        return new this(x).asin();
      }


      /*
       * Return a new Decimal whose value is the inverse of the hyperbolic sine of `x`, rounded to
       * `precision` significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function asinh(x) {
        return new this(x).asinh();
      }


      /*
       * Return a new Decimal whose value is the arctangent in radians of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       *
       */
      function atan(x) {
        return new this(x).atan();
      }


      /*
       * Return a new Decimal whose value is the inverse of the hyperbolic tangent of `x`, rounded to
       * `precision` significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function atanh(x) {
        return new this(x).atanh();
      }


      /*
       * Return a new Decimal whose value is the arctangent in radians of `y/x` in the range -pi to pi
       * (inclusive), rounded to `precision` significant digits using rounding mode `rounding`.
       *
       * Domain: [-Infinity, Infinity]
       * Range: [-pi, pi]
       *
       * y {number|string|Decimal} The y-coordinate.
       * x {number|string|Decimal} The x-coordinate.
       *
       * atan2(±0, -0)               = ±pi
       * atan2(±0, +0)               = ±0
       * atan2(±0, -x)               = ±pi for x > 0
       * atan2(±0, x)                = ±0 for x > 0
       * atan2(-y, ±0)               = -pi/2 for y > 0
       * atan2(y, ±0)                = pi/2 for y > 0
       * atan2(±y, -Infinity)        = ±pi for finite y > 0
       * atan2(±y, +Infinity)        = ±0 for finite y > 0
       * atan2(±Infinity, x)         = ±pi/2 for finite x
       * atan2(±Infinity, -Infinity) = ±3*pi/4
       * atan2(±Infinity, +Infinity) = ±pi/4
       * atan2(NaN, x) = NaN
       * atan2(y, NaN) = NaN
       *
       */
      function atan2(y, x) {
        y = new this(y);
        x = new this(x);
        var r,
          pr = this.precision,
          rm = this.rounding,
          wpr = pr + 4;

        // Either NaN
        if (!y.s || !x.s) {
          r = new this(NaN);

        // Both ±Infinity
        } else if (!y.d && !x.d) {
          r = getPi(this, wpr, 1).times(x.s > 0 ? 0.25 : 0.75);
          r.s = y.s;

        // x is ±Infinity or y is ±0
        } else if (!x.d || y.isZero()) {
          r = x.s < 0 ? getPi(this, pr, rm) : new this(0);
          r.s = y.s;

        // y is ±Infinity or x is ±0
        } else if (!y.d || x.isZero()) {
          r = getPi(this, wpr, 1).times(0.5);
          r.s = y.s;

        // Both non-zero and finite
        } else if (x.s < 0) {
          this.precision = wpr;
          this.rounding = 1;
          r = this.atan(divide(y, x, wpr, 1));
          x = getPi(this, wpr, 1);
          this.precision = pr;
          this.rounding = rm;
          r = y.s < 0 ? r.minus(x) : r.plus(x);
        } else {
          r = this.atan(divide(y, x, wpr, 1));
        }

        return r;
      }


      /*
       * Return a new Decimal whose value is the cube root of `x`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       *
       */
      function cbrt(x) {
        return new this(x).cbrt();
      }


      /*
       * Return a new Decimal whose value is `x` rounded to an integer using `ROUND_CEIL`.
       *
       * x {number|string|Decimal}
       *
       */
      function ceil(x) {
        return finalise(x = new this(x), x.e + 1, 2);
      }


      /*
       * Return a new Decimal whose value is `x` clamped to the range delineated by `min` and `max`.
       *
       * x {number|string|Decimal}
       * min {number|string|Decimal}
       * max {number|string|Decimal}
       *
       */
      function clamp(x, min, max) {
        return new this(x).clamp(min, max);
      }


      /*
       * Configure global settings for a Decimal constructor.
       *
       * `obj` is an object with one or more of the following properties,
       *
       *   precision  {number}
       *   rounding   {number}
       *   toExpNeg   {number}
       *   toExpPos   {number}
       *   maxE       {number}
       *   minE       {number}
       *   modulo     {number}
       *   crypto     {boolean|number}
       *   defaults   {true}
       *
       * E.g. Decimal.config({ precision: 20, rounding: 4 })
       *
       */
      function config(obj) {
        if (!obj || typeof obj !== 'object') throw Error(decimalError + 'Object expected');
        var i, p, v,
          useDefaults = obj.defaults === true,
          ps = [
            'precision', 1, MAX_DIGITS,
            'rounding', 0, 8,
            'toExpNeg', -EXP_LIMIT, 0,
            'toExpPos', 0, EXP_LIMIT,
            'maxE', 0, EXP_LIMIT,
            'minE', -EXP_LIMIT, 0,
            'modulo', 0, 9
          ];

        for (i = 0; i < ps.length; i += 3) {
          if (p = ps[i], useDefaults) this[p] = DEFAULTS[p];
          if ((v = obj[p]) !== void 0) {
            if (mathfloor(v) === v && v >= ps[i + 1] && v <= ps[i + 2]) this[p] = v;
            else throw Error(invalidArgument + p + ': ' + v);
          }
        }

        if (p = 'crypto', useDefaults) this[p] = DEFAULTS[p];
        if ((v = obj[p]) !== void 0) {
          if (v === true || v === false || v === 0 || v === 1) {
            if (v) {
              if (typeof crypto != 'undefined' && crypto &&
                (crypto.getRandomValues || crypto.randomBytes)) {
                this[p] = true;
              } else {
                throw Error(cryptoUnavailable);
              }
            } else {
              this[p] = false;
            }
          } else {
            throw Error(invalidArgument + p + ': ' + v);
          }
        }

        return this;
      }


      /*
       * Return a new Decimal whose value is the cosine of `x`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function cos(x) {
        return new this(x).cos();
      }


      /*
       * Return a new Decimal whose value is the hyperbolic cosine of `x`, rounded to precision
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function cosh(x) {
        return new this(x).cosh();
      }


      /*
       * Create and return a Decimal constructor with the same configuration properties as this Decimal
       * constructor.
       *
       */
      function clone(obj) {
        var i, p, ps;

        /*
         * The Decimal constructor and exported function.
         * Return a new Decimal instance.
         *
         * v {number|string|Decimal} A numeric value.
         *
         */
        function Decimal(v) {
          var e, i, t,
            x = this;

          // Decimal called without new.
          if (!(x instanceof Decimal)) return new Decimal(v);

          // Retain a reference to this Decimal constructor, and shadow Decimal.prototype.constructor
          // which points to Object.
          x.constructor = Decimal;

          // Duplicate.
          if (isDecimalInstance(v)) {
            x.s = v.s;

            if (external) {
              if (!v.d || v.e > Decimal.maxE) {

                // Infinity.
                x.e = NaN;
                x.d = null;
              } else if (v.e < Decimal.minE) {

                // Zero.
                x.e = 0;
                x.d = [0];
              } else {
                x.e = v.e;
                x.d = v.d.slice();
              }
            } else {
              x.e = v.e;
              x.d = v.d ? v.d.slice() : v.d;
            }

            return;
          }

          t = typeof v;

          if (t === 'number') {
            if (v === 0) {
              x.s = 1 / v < 0 ? -1 : 1;
              x.e = 0;
              x.d = [0];
              return;
            }

            if (v < 0) {
              v = -v;
              x.s = -1;
            } else {
              x.s = 1;
            }

            // Fast path for small integers.
            if (v === ~~v && v < 1e7) {
              for (e = 0, i = v; i >= 10; i /= 10) e++;

              if (external) {
                if (e > Decimal.maxE) {
                  x.e = NaN;
                  x.d = null;
                } else if (e < Decimal.minE) {
                  x.e = 0;
                  x.d = [0];
                } else {
                  x.e = e;
                  x.d = [v];
                }
              } else {
                x.e = e;
                x.d = [v];
              }

              return;

            // Infinity, NaN.
            } else if (v * 0 !== 0) {
              if (!v) x.s = NaN;
              x.e = NaN;
              x.d = null;
              return;
            }

            return parseDecimal(x, v.toString());

          } else if (t !== 'string') {
            throw Error(invalidArgument + v);
          }

          // Minus sign?
          if ((i = v.charCodeAt(0)) === 45) {
            v = v.slice(1);
            x.s = -1;
          } else {
            // Plus sign?
            if (i === 43) v = v.slice(1);
            x.s = 1;
          }

          return isDecimal.test(v) ? parseDecimal(x, v) : parseOther(x, v);
        }

        Decimal.prototype = P;

        Decimal.ROUND_UP = 0;
        Decimal.ROUND_DOWN = 1;
        Decimal.ROUND_CEIL = 2;
        Decimal.ROUND_FLOOR = 3;
        Decimal.ROUND_HALF_UP = 4;
        Decimal.ROUND_HALF_DOWN = 5;
        Decimal.ROUND_HALF_EVEN = 6;
        Decimal.ROUND_HALF_CEIL = 7;
        Decimal.ROUND_HALF_FLOOR = 8;
        Decimal.EUCLID = 9;

        Decimal.config = Decimal.set = config;
        Decimal.clone = clone;
        Decimal.isDecimal = isDecimalInstance;

        Decimal.abs = abs;
        Decimal.acos = acos;
        Decimal.acosh = acosh;        // ES6
        Decimal.add = add;
        Decimal.asin = asin;
        Decimal.asinh = asinh;        // ES6
        Decimal.atan = atan;
        Decimal.atanh = atanh;        // ES6
        Decimal.atan2 = atan2;
        Decimal.cbrt = cbrt;          // ES6
        Decimal.ceil = ceil;
        Decimal.clamp = clamp;
        Decimal.cos = cos;
        Decimal.cosh = cosh;          // ES6
        Decimal.div = div;
        Decimal.exp = exp;
        Decimal.floor = floor;
        Decimal.hypot = hypot;        // ES6
        Decimal.ln = ln;
        Decimal.log = log;
        Decimal.log10 = log10;        // ES6
        Decimal.log2 = log2;          // ES6
        Decimal.max = max;
        Decimal.min = min;
        Decimal.mod = mod;
        Decimal.mul = mul;
        Decimal.pow = pow;
        Decimal.random = random;
        Decimal.round = round;
        Decimal.sign = sign;          // ES6
        Decimal.sin = sin;
        Decimal.sinh = sinh;          // ES6
        Decimal.sqrt = sqrt;
        Decimal.sub = sub;
        Decimal.sum = sum;
        Decimal.tan = tan;
        Decimal.tanh = tanh;          // ES6
        Decimal.trunc = trunc;        // ES6

        if (obj === void 0) obj = {};
        if (obj) {
          if (obj.defaults !== true) {
            ps = ['precision', 'rounding', 'toExpNeg', 'toExpPos', 'maxE', 'minE', 'modulo', 'crypto'];
            for (i = 0; i < ps.length;) if (!obj.hasOwnProperty(p = ps[i++])) obj[p] = this[p];
          }
        }

        Decimal.config(obj);

        return Decimal;
      }


      /*
       * Return a new Decimal whose value is `x` divided by `y`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       * y {number|string|Decimal}
       *
       */
      function div(x, y) {
        return new this(x).div(y);
      }


      /*
       * Return a new Decimal whose value is the natural exponential of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} The power to which to raise the base of the natural log.
       *
       */
      function exp(x) {
        return new this(x).exp();
      }


      /*
       * Return a new Decimal whose value is `x` round to an integer using `ROUND_FLOOR`.
       *
       * x {number|string|Decimal}
       *
       */
      function floor(x) {
        return finalise(x = new this(x), x.e + 1, 3);
      }


      /*
       * Return a new Decimal whose value is the square root of the sum of the squares of the arguments,
       * rounded to `precision` significant digits using rounding mode `rounding`.
       *
       * hypot(a, b, ...) = sqrt(a^2 + b^2 + ...)
       *
       * arguments {number|string|Decimal}
       *
       */
      function hypot() {
        var i, n,
          t = new this(0);

        external = false;

        for (i = 0; i < arguments.length;) {
          n = new this(arguments[i++]);
          if (!n.d) {
            if (n.s) {
              external = true;
              return new this(1 / 0);
            }
            t = n;
          } else if (t.d) {
            t = t.plus(n.times(n));
          }
        }

        external = true;

        return t.sqrt();
      }


      /*
       * Return true if object is a Decimal instance (where Decimal is any Decimal constructor),
       * otherwise return false.
       *
       */
      function isDecimalInstance(obj) {
        return obj instanceof Decimal || obj && obj.toStringTag === tag || false;
      }


      /*
       * Return a new Decimal whose value is the natural logarithm of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       *
       */
      function ln(x) {
        return new this(x).ln();
      }


      /*
       * Return a new Decimal whose value is the log of `x` to the base `y`, or to base 10 if no base
       * is specified, rounded to `precision` significant digits using rounding mode `rounding`.
       *
       * log[y](x)
       *
       * x {number|string|Decimal} The argument of the logarithm.
       * y {number|string|Decimal} The base of the logarithm.
       *
       */
      function log(x, y) {
        return new this(x).log(y);
      }


      /*
       * Return a new Decimal whose value is the base 2 logarithm of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       *
       */
      function log2(x) {
        return new this(x).log(2);
      }


      /*
       * Return a new Decimal whose value is the base 10 logarithm of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       *
       */
      function log10(x) {
        return new this(x).log(10);
      }


      /*
       * Return a new Decimal whose value is the maximum of the arguments.
       *
       * arguments {number|string|Decimal}
       *
       */
      function max() {
        return maxOrMin(this, arguments, 'lt');
      }


      /*
       * Return a new Decimal whose value is the minimum of the arguments.
       *
       * arguments {number|string|Decimal}
       *
       */
      function min() {
        return maxOrMin(this, arguments, 'gt');
      }


      /*
       * Return a new Decimal whose value is `x` modulo `y`, rounded to `precision` significant digits
       * using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       * y {number|string|Decimal}
       *
       */
      function mod(x, y) {
        return new this(x).mod(y);
      }


      /*
       * Return a new Decimal whose value is `x` multiplied by `y`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       * y {number|string|Decimal}
       *
       */
      function mul(x, y) {
        return new this(x).mul(y);
      }


      /*
       * Return a new Decimal whose value is `x` raised to the power `y`, rounded to precision
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} The base.
       * y {number|string|Decimal} The exponent.
       *
       */
      function pow(x, y) {
        return new this(x).pow(y);
      }


      /*
       * Returns a new Decimal with a random value equal to or greater than 0 and less than 1, and with
       * `sd`, or `Decimal.precision` if `sd` is omitted, significant digits (or less if trailing zeros
       * are produced).
       *
       * [sd] {number} Significant digits. Integer, 0 to MAX_DIGITS inclusive.
       *
       */
      function random(sd) {
        var d, e, k, n,
          i = 0,
          r = new this(1),
          rd = [];

        if (sd === void 0) sd = this.precision;
        else checkInt32(sd, 1, MAX_DIGITS);

        k = Math.ceil(sd / LOG_BASE);

        if (!this.crypto) {
          for (; i < k;) rd[i++] = Math.random() * 1e7 | 0;

        // Browsers supporting crypto.getRandomValues.
        } else if (crypto.getRandomValues) {
          d = crypto.getRandomValues(new Uint32Array(k));

          for (; i < k;) {
            n = d[i];

            // 0 <= n < 4294967296
            // Probability n >= 4.29e9, is 4967296 / 4294967296 = 0.00116 (1 in 865).
            if (n >= 4.29e9) {
              d[i] = crypto.getRandomValues(new Uint32Array(1))[0];
            } else {

              // 0 <= n <= 4289999999
              // 0 <= (n % 1e7) <= 9999999
              rd[i++] = n % 1e7;
            }
          }

        // Node.js supporting crypto.randomBytes.
        } else if (crypto.randomBytes) {

          // buffer
          d = crypto.randomBytes(k *= 4);

          for (; i < k;) {

            // 0 <= n < 2147483648
            n = d[i] + (d[i + 1] << 8) + (d[i + 2] << 16) + ((d[i + 3] & 0x7f) << 24);

            // Probability n >= 2.14e9, is 7483648 / 2147483648 = 0.0035 (1 in 286).
            if (n >= 2.14e9) {
              crypto.randomBytes(4).copy(d, i);
            } else {

              // 0 <= n <= 2139999999
              // 0 <= (n % 1e7) <= 9999999
              rd.push(n % 1e7);
              i += 4;
            }
          }

          i = k / 4;
        } else {
          throw Error(cryptoUnavailable);
        }

        k = rd[--i];
        sd %= LOG_BASE;

        // Convert trailing digits to zeros according to sd.
        if (k && sd) {
          n = mathpow(10, LOG_BASE - sd);
          rd[i] = (k / n | 0) * n;
        }

        // Remove trailing words which are zero.
        for (; rd[i] === 0; i--) rd.pop();

        // Zero?
        if (i < 0) {
          e = 0;
          rd = [0];
        } else {
          e = -1;

          // Remove leading words which are zero and adjust exponent accordingly.
          for (; rd[0] === 0; e -= LOG_BASE) rd.shift();

          // Count the digits of the first word of rd to determine leading zeros.
          for (k = 1, n = rd[0]; n >= 10; n /= 10) k++;

          // Adjust the exponent for leading zeros of the first word of rd.
          if (k < LOG_BASE) e -= LOG_BASE - k;
        }

        r.e = e;
        r.d = rd;

        return r;
      }


      /*
       * Return a new Decimal whose value is `x` rounded to an integer using rounding mode `rounding`.
       *
       * To emulate `Math.round`, set rounding to 7 (ROUND_HALF_CEIL).
       *
       * x {number|string|Decimal}
       *
       */
      function round(x) {
        return finalise(x = new this(x), x.e + 1, this.rounding);
      }


      /*
       * Return
       *   1    if x > 0,
       *  -1    if x < 0,
       *   0    if x is 0,
       *  -0    if x is -0,
       *   NaN  otherwise
       *
       * x {number|string|Decimal}
       *
       */
      function sign(x) {
        x = new this(x);
        return x.d ? (x.d[0] ? x.s : 0 * x.s) : x.s || NaN;
      }


      /*
       * Return a new Decimal whose value is the sine of `x`, rounded to `precision` significant digits
       * using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function sin(x) {
        return new this(x).sin();
      }


      /*
       * Return a new Decimal whose value is the hyperbolic sine of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function sinh(x) {
        return new this(x).sinh();
      }


      /*
       * Return a new Decimal whose value is the square root of `x`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       *
       */
      function sqrt(x) {
        return new this(x).sqrt();
      }


      /*
       * Return a new Decimal whose value is `x` minus `y`, rounded to `precision` significant digits
       * using rounding mode `rounding`.
       *
       * x {number|string|Decimal}
       * y {number|string|Decimal}
       *
       */
      function sub(x, y) {
        return new this(x).sub(y);
      }


      /*
       * Return a new Decimal whose value is the sum of the arguments, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * Only the result is rounded, not the intermediate calculations.
       *
       * arguments {number|string|Decimal}
       *
       */
      function sum() {
        var i = 0,
          args = arguments,
          x = new this(args[i]);

        external = false;
        for (; x.s && ++i < args.length;) x = x.plus(args[i]);
        external = true;

        return finalise(x, this.precision, this.rounding);
      }


      /*
       * Return a new Decimal whose value is the tangent of `x`, rounded to `precision` significant
       * digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function tan(x) {
        return new this(x).tan();
      }


      /*
       * Return a new Decimal whose value is the hyperbolic tangent of `x`, rounded to `precision`
       * significant digits using rounding mode `rounding`.
       *
       * x {number|string|Decimal} A value in radians.
       *
       */
      function tanh(x) {
        return new this(x).tanh();
      }


      /*
       * Return a new Decimal whose value is `x` truncated to an integer.
       *
       * x {number|string|Decimal}
       *
       */
      function trunc(x) {
        return finalise(x = new this(x), x.e + 1, 1);
      }


      // Create and configure initial Decimal constructor.
      Decimal = clone(DEFAULTS);
      Decimal.prototype.constructor = Decimal;
      Decimal['default'] = Decimal.Decimal = Decimal;

      // Create the internal constants from their string values.
      LN10 = new Decimal(LN10);
      PI = new Decimal(PI);


      // Export.


      // AMD.
      if (module.exports) {
        if (typeof Symbol == 'function' && typeof Symbol.iterator == 'symbol') {
          P[Symbol['for']('nodejs.util.inspect.custom')] = P.toString;
          P[Symbol.toStringTag] = 'Decimal';
        }

        module.exports = Decimal;

      // Browser.
      } else {
        if (!globalScope) {
          globalScope = typeof self != 'undefined' && self && self.self == self ? self : window;
        }

        noConflict = globalScope.Decimal;
        Decimal.noConflict = function () {
          globalScope.Decimal = noConflict;
          return Decimal;
        };

        globalScope.Decimal = Decimal;
      }
    })(commonjsGlobal);
    });

    /* src\zero\Model.svelte generated by Svelte v3.38.3 */




    function on$1(name, cb) {
    	onAny(name, cb);
    }

    function fire(name, args) {
    	fireAny(name, args);
    }

    function newTimedCmd$1(cmd, timeout, jitter) {
    	return new CTimedCmd(cmd, timeout, jitter !== null && jitter !== void 0 ? jitter : 0);
    }

    /* src\zero\Count.svelte generated by Svelte v3.38.3 */
    const file$7 = "src\\zero\\Count.svelte";

    function create_fragment$9(ctx) {
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
    			add_location(button, file$7, 9, 0, 276);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(pulse.call(null, button)),
    					action_destroyer(bounceOnDrag.call(null, button))
    				];

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
    			run_all(dispose);
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
    		bounceOnDrag,
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
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { ga: 0, count: 1, sz: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Count",
    			options,
    			id: create_fragment$9.name
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

    /* src\core\AsciiMathUtils.svelte generated by Svelte v3.38.3 */

    function toAscii(str) {
    	return `\`${str}\``;
    }

    function D(num) {
    	return new decimal.Decimal(num);
    }

    function fractionToMath(num) {
    	let sign = num.isNeg() ? "-" : "";
    	let w = num.trunc();
    	let n = num.minus(w).abs();

    	if (n.eq(0)) {
    		let str = num.toNumber().toLocaleString("en");
    		return [false, str, str.length];
    	}

    	let d = D(1);

    	while (!n.toFraction()[1].eq(1)) {
    		n = n.mul(10);
    		d = d.mul(10);
    	}

    	let math = w.eq(0) ? `${sign}${n}/${d}` : `${w} ${n}/${d}`;

    	// console.log(`${num}: '${math}'`);
    	return [true, math, math.length];
    }

    /* src\zero\Num.svelte generated by Svelte v3.38.3 */
    const file$6 = "src\\zero\\Num.svelte";

    function create_fragment$8(ctx) {
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
    			add_location(button, file$6, 24, 0, 704);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(pulse.call(null, button)),
    					action_destroyer(bounceOnDrag.call(null, button))
    				];

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
    	let _text;
    	let _len;
    	let _sz;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Num", slots, []);
    	
    	let { ga } = $$props;
    	let { num } = $$props;
    	let { asAsciiMath } = $$props;
    	let { sz = 30 } = $$props;

    	function n2a(n) {
    		let str = n.toNumber().toLocaleString("en");
    		let [isFraction, math, len] = fractionToMath(n);
    		if (!isFraction || !asAsciiMath) return [str, str.length];
    		if (isFraction) len += 2;
    		return [toAscii(math), len];
    	}

    	let _bgColor = getBgColor(ga);
    	const writable_props = ["ga", "num", "asAsciiMath", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Num> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("num" in $$props) $$invalidate(4, num = $$props.num);
    		if ("asAsciiMath" in $$props) $$invalidate(5, asAsciiMath = $$props.asAsciiMath);
    		if ("sz" in $$props) $$invalidate(6, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		getBgColor,
    		toAscii,
    		fractionToMath,
    		bounceOnDrag,
    		ga,
    		num,
    		asAsciiMath,
    		sz,
    		n2a,
    		_bgColor,
    		_text,
    		_len,
    		_sz
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("num" in $$props) $$invalidate(4, num = $$props.num);
    		if ("asAsciiMath" in $$props) $$invalidate(5, asAsciiMath = $$props.asAsciiMath);
    		if ("sz" in $$props) $$invalidate(6, sz = $$props.sz);
    		if ("_bgColor" in $$props) $$invalidate(3, _bgColor = $$props._bgColor);
    		if ("_text" in $$props) $$invalidate(1, _text = $$props._text);
    		if ("_len" in $$props) $$invalidate(7, _len = $$props._len);
    		if ("_sz" in $$props) $$invalidate(2, _sz = $$props._sz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*num*/ 16) {
    			$$invalidate(1, [_text, _len] = n2a(num), _text, ($$invalidate(7, _len), $$invalidate(4, num)));
    		}

    		if ($$self.$$.dirty & /*sz, _len*/ 192) {
    			$$invalidate(2, _sz = sz - 1.2 * _len);
    		}
    	};

    	return [ga, _text, _sz, _bgColor, num, asAsciiMath, sz, _len];
    }

    class Num extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { ga: 0, num: 4, asAsciiMath: 5, sz: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Num",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Num> was created without expected prop 'ga'");
    		}

    		if (/*num*/ ctx[4] === undefined && !("num" in props)) {
    			console.warn("<Num> was created without expected prop 'num'");
    		}

    		if (/*asAsciiMath*/ ctx[5] === undefined && !("asAsciiMath" in props)) {
    			console.warn("<Num> was created without expected prop 'asAsciiMath'");
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

    	get asAsciiMath() {
    		throw new Error("<Num>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set asAsciiMath(value) {
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
    const file$5 = "src\\zero\\Ans.svelte";

    function create_fragment$7(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*_text*/ ctx[1]);
    			attr_dev(button, "class", /*_bgColor*/ ctx[2]);
    			set_style(button, "grid-area", /*ga*/ ctx[0]);
    			set_style(button, "font-size", /*_sz*/ ctx[3] + "px");
    			add_location(button, file$5, 25, 0, 721);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*click_handler*/ ctx[10], false, false, false),
    					action_destroyer(pulse.call(null, button)),
    					action_destroyer(bounceOnDrag.call(null, button))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_text*/ 2) set_data_dev(t, /*_text*/ ctx[1]);

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
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let _text;
    	let _len;
    	let _scale;
    	let _sz;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Ans", slots, []);
    	
    	let { ga } = $$props;
    	let { num } = $$props;
    	let { asAsciiMath } = $$props;
    	let { sz = 30 } = $$props;

    	function n2a(n) {
    		let str = n.toNumber().toLocaleString("en");
    		let [isFraction, math, len] = fractionToMath(n);
    		if (!isFraction || !asAsciiMath) return [str, str.length];
    		return [toAscii(math), len];
    	}

    	let _bgColor = "bg-gray-100";

    	function setBgColor(value) {
    		$$invalidate(2, _bgColor = value);
    	}

    	const writable_props = ["ga", "num", "asAsciiMath", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Ans> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("num" in $$props) $$invalidate(4, num = $$props.num);
    		if ("asAsciiMath" in $$props) $$invalidate(5, asAsciiMath = $$props.asAsciiMath);
    		if ("sz" in $$props) $$invalidate(6, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		toAscii,
    		fractionToMath,
    		pulse,
    		bounceOnDrag,
    		ga,
    		num,
    		asAsciiMath,
    		sz,
    		n2a,
    		_bgColor,
    		setBgColor,
    		_text,
    		_len,
    		_scale,
    		_sz
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("num" in $$props) $$invalidate(4, num = $$props.num);
    		if ("asAsciiMath" in $$props) $$invalidate(5, asAsciiMath = $$props.asAsciiMath);
    		if ("sz" in $$props) $$invalidate(6, sz = $$props.sz);
    		if ("_bgColor" in $$props) $$invalidate(2, _bgColor = $$props._bgColor);
    		if ("_text" in $$props) $$invalidate(1, _text = $$props._text);
    		if ("_len" in $$props) $$invalidate(8, _len = $$props._len);
    		if ("_scale" in $$props) $$invalidate(9, _scale = $$props._scale);
    		if ("_sz" in $$props) $$invalidate(3, _sz = $$props._sz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*num*/ 16) {
    			$$invalidate(1, [_text, _len] = n2a(num), _text, ($$invalidate(8, _len), $$invalidate(4, num)));
    		}

    		if ($$self.$$.dirty & /*_len*/ 256) {
    			$$invalidate(9, _scale = _len < 5 ? 1.2 : 1.5);
    		}

    		if ($$self.$$.dirty & /*sz, _scale, _text*/ 578) {
    			$$invalidate(3, _sz = sz - _scale * _text.length);
    		}
    	};

    	return [
    		ga,
    		_text,
    		_bgColor,
    		_sz,
    		num,
    		asAsciiMath,
    		sz,
    		setBgColor,
    		_len,
    		_scale,
    		click_handler
    	];
    }

    class Ans$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			ga: 0,
    			num: 4,
    			asAsciiMath: 5,
    			sz: 6,
    			setBgColor: 7
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ans",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Ans> was created without expected prop 'ga'");
    		}

    		if (/*num*/ ctx[4] === undefined && !("num" in props)) {
    			console.warn("<Ans> was created without expected prop 'num'");
    		}

    		if (/*asAsciiMath*/ ctx[5] === undefined && !("asAsciiMath" in props)) {
    			console.warn("<Ans> was created without expected prop 'asAsciiMath'");
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

    	get asAsciiMath() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set asAsciiMath(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setBgColor() {
    		return this.$$.ctx[7];
    	}

    	set setBgColor(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\zero\Op.svelte generated by Svelte v3.38.3 */
    const file$4 = "src\\zero\\Op.svelte";

    function create_fragment$6(ctx) {
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
    			add_location(button, file$4, 10, 0, 318);
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
    					action_destroyer(pulse.call(null, button)),
    					action_destroyer(bounceOnDrag.call(null, button))
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
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
    		bounceOnDrag,
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
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { ga: 0, op: 1, sz: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Op",
    			options,
    			id: create_fragment$6.name
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

    const { Object: Object_1 } = globals;

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	child_ctx[33] = list;
    	child_ctx[34] = i;
    	return child_ctx;
    }

    // (256:4) {#key recreate[0]}
    function create_key_block_1(ctx) {
    	let num;
    	let current;

    	num = new Num({
    			props: {
    				ga: "lhs",
    				num: /*_game*/ ctx[1].nums[0],
    				asAsciiMath: /*_withFractions*/ ctx[2] && trueFalse()
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(num.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(num, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const num_changes = {};
    			if (dirty[0] & /*_game*/ 2) num_changes.num = /*_game*/ ctx[1].nums[0];
    			if (dirty[0] & /*_withFractions*/ 4) num_changes.asAsciiMath = /*_withFractions*/ ctx[2] && trueFalse();
    			num.$set(num_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(num.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(num.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(num, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block_1.name,
    		type: "key",
    		source: "(256:4) {#key recreate[0]}",
    		ctx
    	});

    	return block;
    }

    // (264:4) {#key recreate[0]}
    function create_key_block(ctx) {
    	let num;
    	let current;

    	num = new Num({
    			props: {
    				ga: "rhs",
    				num: /*_game*/ ctx[1].nums[1],
    				asAsciiMath: /*_withFractions*/ ctx[2] && trueFalse()
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(num.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(num, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const num_changes = {};
    			if (dirty[0] & /*_game*/ 2) num_changes.num = /*_game*/ ctx[1].nums[1];
    			if (dirty[0] & /*_withFractions*/ 4) num_changes.asAsciiMath = /*_withFractions*/ ctx[2] && trueFalse();
    			num.$set(num_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(num.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(num.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(num, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block.name,
    		type: "key",
    		source: "(264:4) {#key recreate[0]}",
    		ctx
    	});

    	return block;
    }

    // (270:4) {#each _game.answers as ans, i (recreate[i]) }
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let ans;
    	let i = /*i*/ ctx[34];
    	let current;
    	const assign_ans = () => /*ans_binding*/ ctx[9](ans, i);
    	const unassign_ans = () => /*ans_binding*/ ctx[9](null, i);

    	function click_handler() {
    		return /*click_handler*/ ctx[10](/*i*/ ctx[34]);
    	}

    	let ans_props = {
    		ga: `a${/*i*/ ctx[34]}`,
    		num: /*ans*/ ctx[32],
    		asAsciiMath: /*_withFractions*/ ctx[2] && /*_game*/ ctx[1].asAsceeMath[/*i*/ ctx[34]]
    	};

    	ans = new Ans$1({ props: ans_props, $$inline: true });
    	assign_ans();
    	ans.$on("click", click_handler);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(ans.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(ans, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (i !== /*i*/ ctx[34]) {
    				unassign_ans();
    				i = /*i*/ ctx[34];
    				assign_ans();
    			}

    			const ans_changes = {};
    			if (dirty[0] & /*_game*/ 2) ans_changes.ga = `a${/*i*/ ctx[34]}`;
    			if (dirty[0] & /*_game*/ 2) ans_changes.num = /*ans*/ ctx[32];
    			if (dirty[0] & /*_withFractions, _game*/ 6) ans_changes.asAsciiMath = /*_withFractions*/ ctx[2] && /*_game*/ ctx[1].asAsceeMath[/*i*/ ctx[34]];
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
    			if (detaching) detach_dev(first);
    			unassign_ans();
    			destroy_component(ans, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(270:4) {#each _game.answers as ans, i (recreate[i]) }",
    		ctx
    	});

    	return block;
    }

    // (250:0) <Grid {layout}      on:click={() => fire("--evt-click")}  >
    function create_default_slot$2(ctx) {
    	let count;
    	let t0;
    	let clock;
    	let t1;
    	let previous_key = /*recreate*/ ctx[4][0];
    	let t2;
    	let op;
    	let t3;
    	let previous_key_1 = /*recreate*/ ctx[4][0];
    	let t4;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t5;
    	let congrats_1;
    	let current;

    	count = new Count({
    			props: { ga: "cnt", count: /*_roundsLeft*/ ctx[5] },
    			$$inline: true
    		});

    	clock = new Clock({ props: { ga: "clk" }, $$inline: true });
    	let key_block0 = create_key_block_1(ctx);

    	op = new Op({
    			props: { ga: "op", op: /*_game*/ ctx[1].op },
    			$$inline: true
    		});

    	let key_block1 = create_key_block(ctx);
    	let each_value = /*_game*/ ctx[1].answers;
    	validate_each_argument(each_value);
    	const get_key = ctx => /*recreate*/ ctx[4][/*i*/ ctx[34]];
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	let congrats_1_props = {};
    	congrats_1 = new Congrats({ props: congrats_1_props, $$inline: true });
    	/*congrats_1_binding*/ ctx[11](congrats_1);

    	const block = {
    		c: function create() {
    			create_component(count.$$.fragment);
    			t0 = space();
    			create_component(clock.$$.fragment);
    			t1 = space();
    			key_block0.c();
    			t2 = space();
    			create_component(op.$$.fragment);
    			t3 = space();
    			key_block1.c();
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
    			key_block0.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(op, target, anchor);
    			insert_dev(target, t3, anchor);
    			key_block1.m(target, anchor);
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
    			if (dirty[0] & /*_roundsLeft*/ 32) count_changes.count = /*_roundsLeft*/ ctx[5];
    			count.$set(count_changes);

    			if (dirty[0] & /*recreate*/ 16 && safe_not_equal(previous_key, previous_key = /*recreate*/ ctx[4][0])) {
    				group_outros();
    				transition_out(key_block0, 1, 1, noop);
    				check_outros();
    				key_block0 = create_key_block_1(ctx);
    				key_block0.c();
    				transition_in(key_block0);
    				key_block0.m(t2.parentNode, t2);
    			} else {
    				key_block0.p(ctx, dirty);
    			}

    			const op_changes = {};
    			if (dirty[0] & /*_game*/ 2) op_changes.op = /*_game*/ ctx[1].op;
    			op.$set(op_changes);

    			if (dirty[0] & /*recreate*/ 16 && safe_not_equal(previous_key_1, previous_key_1 = /*recreate*/ ctx[4][0])) {
    				group_outros();
    				transition_out(key_block1, 1, 1, noop);
    				check_outros();
    				key_block1 = create_key_block(ctx);
    				key_block1.c();
    				transition_in(key_block1);
    				key_block1.m(t4.parentNode, t4);
    			} else {
    				key_block1.p(ctx, dirty);
    			}

    			if (dirty[0] & /*_game, _withFractions, answers, select, recreate*/ 94) {
    				each_value = /*_game*/ ctx[1].answers;
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, t5.parentNode, outro_and_destroy_block, create_each_block$1, t5, get_each_context$1);
    				check_outros();
    			}

    			const congrats_1_changes = {};
    			congrats_1.$set(congrats_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(count.$$.fragment, local);
    			transition_in(clock.$$.fragment, local);
    			transition_in(key_block0);
    			transition_in(op.$$.fragment, local);
    			transition_in(key_block1);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(congrats_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(count.$$.fragment, local);
    			transition_out(clock.$$.fragment, local);
    			transition_out(key_block0);
    			transition_out(op.$$.fragment, local);
    			transition_out(key_block1);

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
    			key_block0.d(detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(op, detaching);
    			if (detaching) detach_dev(t3);
    			key_block1.d(detaching);
    			if (detaching) detach_dev(t4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(t5);
    			/*congrats_1_binding*/ ctx[11](null);
    			destroy_component(congrats_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(250:0) <Grid {layout}      on:click={() => fire(\\\"--evt-click\\\")}  >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let grid;
    	let current;

    	grid = new Grid({
    			props: {
    				layout: /*layout*/ ctx[7],
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	grid.$on("click", /*click_handler_1*/ ctx[12]);

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
    		p: function update(ctx, dirty) {
    			const grid_changes = {};

    			if (dirty[0] & /*congrats, _game, _withFractions, answers, _roundsLeft*/ 47 | dirty[1] & /*$$scope*/ 16) {
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let _roundsLeft;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Main", slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
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

    	
    	let congrats;
    	let _game;
    	let _current = 0;
    	let _rounds = [];
    	let _withFractions = false;
    	let _config = Anki.getConfig();
    	let _tcNewRound = newTimedCmd$1("--cmd-next-round", 1000);
    	let _tcIdle = newTimedCmd$1("--cmd-idle", 7000, 3000);
    	let _a = [1, 9];
    	let _b = [2, 9];
    	let _aA = [];
    	let _bA = [];
    	let answers = [null, null, null];
    	let recreate = answers.map(_ => new Object());
    	let D = n => new decimal.Decimal(n);

    	function getAb() {
    		let a = D(_aA.length > 0 ? randFrom(_aA) : rand(_a[0], _a[1]));
    		let b = D(_bA.length > 0 ? randFrom(_bA) : rand(_b[0], _b[1]));
    		return [a, b];
    	}

    	function getAbPairWithDots(line) {
    		let [za, zb] = shuffle(line);

    		let fa = za < 0
    		? decimal.Decimal.pow(10, rand(za, -1))
    		: decimal.Decimal.pow(10, rand(1, za));

    		let fb = zb < 0
    		? decimal.Decimal.pow(10, rand(zb, -1))
    		: decimal.Decimal.pow(10, rand(1, zb));

    		let [a, b] = getAb();
    		let wrong = b.plus(pm(1));
    		a = a.mul(fa);
    		b = b.mul(fb);
    		wrong = wrong.mul(fb);
    		return { a, b, wrong, fa, fb };
    	}

    	function getAbPair() {
    		let line = Anki.tokens().map(x => parseInt(x));
    		if (line[0] < 0 || line[1] < 0) return getAbPairWithDots(line);
    		let [a, b] = getAb();
    		let wrong = b.plus(pm(1));
    		let fa = D(1);
    		let fb = D(1);
    		let noOfZeros = rand(line[0], line[1]);

    		for (let no = noOfZeros; no-- > 0; ) {
    			if (a.equals(1)) {
    				// ensure first factor is not one
    				a = a.mul(10);

    				fa = fa.mul(10);
    				continue;
    			}

    			switch (trueFalse()) {
    				case true:
    					a = a.mul(10);
    					fa = fa.mul(10);
    					break;
    				case false:
    					b = b.mul(10);
    					fb = fb.mul(10);
    					wrong = wrong.mul(10);
    					break;
    			}
    		}

    		return { a, b, wrong, fa, fb };
    	}

    	function addMulRound() {
    		let op = "x";
    		let { a, b, wrong } = getAbPair();
    		let lhs = a;
    		let rhs = b;
    		let a0 = lhs.mul(rhs);
    		let a1 = lhs.mul(wrong);
    		let a2, a3;

    		switch (trueFalse()) {
    			case true:
    				a2 = a0.mul(10);
    				a3 = a1.mul(10);
    				break;
    			case false:
    				a2 = a0.div(10);
    				a3 = a1.div(10);
    				break;
    		}

    		let nums = shuffle([lhs, rhs]);
    		let answers = shuffle([a0, a1, a2, a3]);
    		let asAsceeMath = answers.map(_ => trueFalse());
    		let rightAt = answers.findIndex(x => x == a0);
    		_rounds.push({ nums, op, answers, asAsceeMath, rightAt });
    	}

    	function addDivRound() {
    		let op = "/";
    		let { a, b, wrong } = getAbPair();
    		let lhs = a.mul(b);
    		let rhs = a;
    		let a0 = b;
    		let a1 = wrong;
    		let a2, a3;

    		switch (trueFalse()) {
    			case true:
    				a2 = a0.mul(10);
    				a3 = a1.mul(10);
    				break;
    			case false:
    				a2 = a0.div(10);
    				a3 = a1.div(10);
    				break;
    		}

    		let nums = [lhs, rhs];
    		let answers = shuffle([a0, a1, a2, a3]);
    		let asAsceeMath = answers.map(_ => trueFalse());
    		let rightAt = answers.findIndex(x => x === a0);
    		_rounds.push({ nums, op, answers, asAsceeMath, rightAt });
    	}

    	function nextRound() {
    		return __awaiter(this, void 0, void 0, function* () {
    			_tcNewRound.cancel();
    			_tcIdle.reset();

    			if ($$invalidate(8, ++_current) === _rounds.length) {
    				addMulRound();
    				addDivRound();
    			}

    			$$invalidate(1, _game = _rounds[_current]);
    			answers.forEach(ans => ans.setBgColor("bg-gray-100"));
    			$$invalidate(4, recreate = answers.map(_ => new Object()));
    			yield tick();
    			refreshMath();
    		});
    	}

    	function init() {
    		var _c;
    		_tcIdle.reset();
    		let cmds = Anki.commands();

    		for (let cmd of cmds) {
    			switch (cmd[0]) {
    				case "dots":
    					break;
    				case "with-fractions":
    					$$invalidate(2, _withFractions = true);
    					break;
    				case "a":
    					_a = cmd.slice(1).map(x => parseInt(x));
    					break;
    				case "b":
    					_b = cmd.slice(1).map(x => parseInt(x));
    					break;
    				case "a[]":
    					_aA = cmd.slice(1).map(x => parseInt(x));
    					break;
    				case "b[]":
    					_bA = cmd.slice(1).map(x => parseInt(x));
    					break;
    			}
    		}

    		let noOfRounds = (_c = _config.rounds) !== null && _c !== void 0 ? _c : 4;

    		for (let cnt = noOfRounds; cnt-- > 0; ) {
    			addMulRound();
    			addDivRound();
    		}

    		$$invalidate(1, _game = _rounds[_current]);
    		refreshMath();
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
    			$$invalidate(5, _roundsLeft = _rounds.length - _current);
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

    	on$1("--cmd-next-round", () => nextRound());
    	on$1("--evt-click", () => onClick());
    	on$1("--cmd-idle", () => idle());
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

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Main> was created with unknown prop '${key}'`);
    	});

    	function ans_binding($$value, i) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			answers[i] = $$value;
    			$$invalidate(3, answers);
    			$$invalidate(1, _game);
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
    		__awaiter,
    		tick,
    		Decimal: decimal.Decimal,
    		refreshMath,
    		rand,
    		shuffle,
    		pm,
    		trueFalse,
    		randFrom,
    		Anki,
    		Mp3,
    		Grid,
    		Clock,
    		Congrats,
    		on: on$1,
    		fire,
    		newTimedCmd: newTimedCmd$1,
    		Count,
    		Num,
    		Ans: Ans$1,
    		Op,
    		congrats,
    		_game,
    		_current,
    		_rounds,
    		_withFractions,
    		_config,
    		_tcNewRound,
    		_tcIdle,
    		_a,
    		_b,
    		_aA,
    		_bA,
    		answers,
    		recreate,
    		D,
    		getAb,
    		getAbPairWithDots,
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
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("congrats" in $$props) $$invalidate(0, congrats = $$props.congrats);
    		if ("_game" in $$props) $$invalidate(1, _game = $$props._game);
    		if ("_current" in $$props) $$invalidate(8, _current = $$props._current);
    		if ("_rounds" in $$props) $$invalidate(18, _rounds = $$props._rounds);
    		if ("_withFractions" in $$props) $$invalidate(2, _withFractions = $$props._withFractions);
    		if ("_config" in $$props) _config = $$props._config;
    		if ("_tcNewRound" in $$props) _tcNewRound = $$props._tcNewRound;
    		if ("_tcIdle" in $$props) _tcIdle = $$props._tcIdle;
    		if ("_a" in $$props) _a = $$props._a;
    		if ("_b" in $$props) _b = $$props._b;
    		if ("_aA" in $$props) _aA = $$props._aA;
    		if ("_bA" in $$props) _bA = $$props._bA;
    		if ("answers" in $$props) $$invalidate(3, answers = $$props.answers);
    		if ("recreate" in $$props) $$invalidate(4, recreate = $$props.recreate);
    		if ("D" in $$props) D = $$props.D;
    		if ("layout" in $$props) $$invalidate(7, layout = $$props.layout);
    		if ("_roundsLeft" in $$props) $$invalidate(5, _roundsLeft = $$props._roundsLeft);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*_current*/ 256) {
    			$$invalidate(5, _roundsLeft = _rounds.length - _current);
    		}
    	};

    	return [
    		congrats,
    		_game,
    		_withFractions,
    		answers,
    		recreate,
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

    class Main$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Main",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\core\AsciiMath.svelte generated by Svelte v3.38.3 */
    const file$3 = "src\\core\\AsciiMath.svelte";

    function create_fragment$4(ctx) {
    	let p;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*exp*/ ctx[1]);
    			attr_dev(p, "class", /*bgColor*/ ctx[2]);
    			set_style(p, "grid-area", /*ga*/ ctx[0]);
    			set_style(p, "font-size", /*_sz*/ ctx[4] + "px");
    			add_location(p, file$3, 39, 0, 1609);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    			/*p_binding*/ ctx[9](p);

    			if (!mounted) {
    				dispose = [
    					listen_dev(p, "click", /*click_handler*/ ctx[8], false, false, false),
    					action_destroyer(bounceOnDrag.call(null, p))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*exp*/ 2) set_data_dev(t, /*exp*/ ctx[1]);

    			if (dirty & /*bgColor*/ 4) {
    				attr_dev(p, "class", /*bgColor*/ ctx[2]);
    			}

    			if (dirty & /*ga*/ 1) {
    				set_style(p, "grid-area", /*ga*/ ctx[0]);
    			}

    			if (dirty & /*_sz*/ 16) {
    				set_style(p, "font-size", /*_sz*/ ctx[4] + "px");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			/*p_binding*/ ctx[9](null);
    			mounted = false;
    			run_all(dispose);
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

    const defaultScale = 1.4;

    function instance$4($$self, $$props, $$invalidate) {
    	let _scale;
    	let _sz;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AsciiMath", slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
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

    	let { ga } = $$props;
    	let { exp } = $$props;
    	let { scale = defaultScale } = $$props;
    	let { bgColor = getBgColor(ga) } = $$props;
    	let { sz = 30 } = $$props;
    	let _self;

    	function update(exp) {
    		return __awaiter(this, void 0, void 0, function* () {
    			yield tick();
    			$$invalidate(3, _self.innerText = "`" + exp + "`", _self);
    			refreshMath();
    			yield delay(1000);

    			_self.querySelectorAll("mjx-c").forEach(el => {
    				pulse(el);
    				bounceOnDrag(el);
    			});
    		});
    	}

    	const writable_props = ["ga", "exp", "scale", "bgColor", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AsciiMath> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function p_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			_self = $$value;
    			$$invalidate(3, _self);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("exp" in $$props) $$invalidate(1, exp = $$props.exp);
    		if ("scale" in $$props) $$invalidate(5, scale = $$props.scale);
    		if ("bgColor" in $$props) $$invalidate(2, bgColor = $$props.bgColor);
    		if ("sz" in $$props) $$invalidate(6, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		__awaiter,
    		tick,
    		refreshMath,
    		delay,
    		pulse,
    		getBgColor,
    		bounceOnDrag,
    		defaultScale,
    		ga,
    		exp,
    		scale,
    		bgColor,
    		sz,
    		_self,
    		update,
    		_scale,
    		_sz
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("exp" in $$props) $$invalidate(1, exp = $$props.exp);
    		if ("scale" in $$props) $$invalidate(5, scale = $$props.scale);
    		if ("bgColor" in $$props) $$invalidate(2, bgColor = $$props.bgColor);
    		if ("sz" in $$props) $$invalidate(6, sz = $$props.sz);
    		if ("_self" in $$props) $$invalidate(3, _self = $$props._self);
    		if ("_scale" in $$props) $$invalidate(7, _scale = $$props._scale);
    		if ("_sz" in $$props) $$invalidate(4, _sz = $$props._sz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*scale*/ 32) {
    			$$invalidate(7, _scale = scale !== null && scale !== void 0
    			? scale
    			: defaultScale);
    		}

    		if ($$self.$$.dirty & /*sz, _scale, exp*/ 194) {
    			$$invalidate(4, _sz = sz - _scale * exp.length);
    		}

    		if ($$self.$$.dirty & /*exp*/ 2) {
    			update(exp);
    		}
    	};

    	return [ga, exp, bgColor, _self, _sz, scale, sz, _scale, click_handler, p_binding];
    }

    class AsciiMath extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			ga: 0,
    			exp: 1,
    			scale: 5,
    			bgColor: 2,
    			sz: 6
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AsciiMath",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<AsciiMath> was created without expected prop 'ga'");
    		}

    		if (/*exp*/ ctx[1] === undefined && !("exp" in props)) {
    			console.warn("<AsciiMath> was created without expected prop 'exp'");
    		}
    	}

    	get ga() {
    		throw new Error("<AsciiMath>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<AsciiMath>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get exp() {
    		throw new Error("<AsciiMath>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set exp(value) {
    		throw new Error("<AsciiMath>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scale() {
    		throw new Error("<AsciiMath>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scale(value) {
    		throw new Error("<AsciiMath>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bgColor() {
    		throw new Error("<AsciiMath>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bgColor(value) {
    		throw new Error("<AsciiMath>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<AsciiMath>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<AsciiMath>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\core\Progress.svelte generated by Svelte v3.38.3 */
    const file$2 = "src\\core\\Progress.svelte";

    function create_fragment$3(ctx) {
    	let div1;
    	let div0;
    	let span;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			span = element("span");
    			t = text(/*_left*/ ctx[0]);
    			add_location(span, file$2, 24, 4, 585);
    			attr_dev(div0, "class", " \\\r\n            text-xs text-center text-black \\\r\n            " + /*_bgColor*/ ctx[2] + " \\\r\n        ");
    			set_style(div0, "width", /*_bar*/ ctx[1] + "%");
    			add_location(div0, file$2, 17, 4, 433);
    			attr_dev(div1, "class", "w-full bg-red-50 text-right");
    			add_location(div1, file$2, 12, 0, 341);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, span);
    			append_dev(span, t);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(pulse.call(null, span)),
    					action_destroyer(pulse.call(null, div1)),
    					action_destroyer(bounceOnDrag.call(null, div1))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_left*/ 1) set_data_dev(t, /*_left*/ ctx[0]);

    			if (dirty & /*_bar*/ 2) {
    				set_style(div0, "width", /*_bar*/ ctx[1] + "%");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
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
    	let _value;
    	let _max;
    	let _left;
    	let _bar;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Progress", slots, []);
    	let { ga } = $$props;
    	let { values } = $$props;
    	let _bgColor = getBgColor(ga);
    	const writable_props = ["ga", "values"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Progress> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(3, ga = $$props.ga);
    		if ("values" in $$props) $$invalidate(4, values = $$props.values);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		getBgColor,
    		bounceOnDrag,
    		ga,
    		values,
    		_bgColor,
    		_value,
    		_max,
    		_left,
    		_bar
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(3, ga = $$props.ga);
    		if ("values" in $$props) $$invalidate(4, values = $$props.values);
    		if ("_bgColor" in $$props) $$invalidate(2, _bgColor = $$props._bgColor);
    		if ("_value" in $$props) $$invalidate(5, _value = $$props._value);
    		if ("_max" in $$props) $$invalidate(6, _max = $$props._max);
    		if ("_left" in $$props) $$invalidate(0, _left = $$props._left);
    		if ("_bar" in $$props) $$invalidate(1, _bar = $$props._bar);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*values*/ 16) {
    			$$invalidate(5, _value = values[0]);
    		}

    		if ($$self.$$.dirty & /*values*/ 16) {
    			$$invalidate(6, _max = values[1]);
    		}

    		if ($$self.$$.dirty & /*_max, _value*/ 96) {
    			$$invalidate(0, _left = _max - _value);
    		}

    		if ($$self.$$.dirty & /*_value, _max*/ 96) {
    			$$invalidate(1, _bar = 100 * (_value / _max));
    		}
    	};

    	return [_left, _bar, _bgColor, ga, values, _value, _max];
    }

    class Progress extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { ga: 3, values: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Progress",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[3] === undefined && !("ga" in props)) {
    			console.warn("<Progress> was created without expected prop 'ga'");
    		}

    		if (/*values*/ ctx[4] === undefined && !("values" in props)) {
    			console.warn("<Progress> was created without expected prop 'values'");
    		}
    	}

    	get ga() {
    		throw new Error("<Progress>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Progress>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get values() {
    		throw new Error("<Progress>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set values(value) {
    		throw new Error("<Progress>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\core\FSM.svelte generated by Svelte v3.38.3 */

    class FSM {
    	configure(config) {
    		
    	}

    	fire(name, args) {
    		
    	}
    }

    function newFsm(config) {
    	let fsm = new FSM();
    	fsm.configure(config);
    	return fsm;
    }

    /* src\equation\Game.svelte generated by Svelte v3.38.3 */



    let _patterns;
    let _next;

    let _fsm = newFsm({
    	exclusiveStates: [["start", "clicked", "answered"], ["right", "wrong"]],
    	on: [],
    	onEnter: {},
    	onTransit: {},
    	transitions: []
    });

    let _config = Anki.getConfig();
    let _totalRounds = _config.rounds;
    let _gameType = "equ+-";
    let _a = [10, 90];
    let _b = [10, 90];
    let _c = [10, 90];
    let _d = [10, 90];
    let _aA = [];
    let _bA = [];
    let _cA = [];
    let _dA = [];
    let _x = ["X"];
    let _noOverflow = false;
    let n2d = n => new decimal.Decimal(n);
    let d2t = d => d.toNumber().toLocaleString("en");

    function getAb() {
    	let a = n2d(_aA.length > 0 ? randFrom(_aA) : rand(_a[0], _a[1]));
    	let b = n2d(_bA.length > 0 ? randFrom(_bA) : rand(_b[0], _b[1]));
    	return [a, b];
    }

    function get(n, nA) {
    	return n2d(nA.length > 0 ? randFrom(nA) : rand(n[0], n[1]));
    }

    function newAbc() {
    	let tzero = n => n - n % 10;

    	if (_gameType === "equ+-") {
    		let [a, b] = getAb();
    		let a0 = rand(1, 9);
    		let b0 = _noOverflow ? rand(0, 9 - a0) : rand(10 - a0, 9);
    		let aa = n2d(tzero(a) + a0);
    		let bb = n2d(tzero(b) + b0);
    		let c = aa.plus(bb);
    		return [...shuffle([aa, bb]), c];
    	}

    	if (_gameType === "equ*/") {
    		let [a, b] = getAb();
    		let c = a.mul(b);
    		return [...shuffle([a, b]), c];
    	}

    	if (_gameType === "ab+c=d") {
    		let [a, b] = getAb();
    		let d = get(_d, _dA);
    		let c = d.minus(a.mul(b));
    		return [...shuffle([a, b]), c, d];
    	}

    	if (_gameType === "%-simple") {
    		let b = get(_b, _bA);
    		let c;
    		let a;
    		let loopLimit = 100;

    		do {
    			c = get(_c, _cA);
    			a = c.mul(100).div(b);
    			if (loopLimit-- <= 0) break;
    		} while (!a.trunc().eq(a));

    		return [a, b, c];
    	}

    	if (_gameType === "%-plus") {
    		// assert _bA is here
    		let b = n2d(randFromIf(_bA, x => x >= 100));

    		let c;
    		let a;
    		let loopLimit = 100;

    		do {
    			c = get(_c, _cA);
    			a = c.mul(100).div(b);
    			if (loopLimit-- <= 0) break;
    		} while (!a.trunc().eq(a));

    		b = b.minus(100);
    		return [a, b, c];
    	}

    	if (_gameType === "%-minus") {
    		// assert _bA is here
    		let b = n2d(randFromIf(_bA, x => x < 100));

    		let c;
    		let a;
    		let loopLimit = 100;

    		do {
    			c = get(_c, _cA);
    			a = c.mul(100).div(b);
    			if (loopLimit-- <= 0) break;
    		} while (!a.trunc().eq(a));

    		b = n2d(100).minus(b);
    		return [a, b, c];
    	}

    	throw `Unknown game type '${_gameType}'`;
    }

    function makeAnswers(rightAns) {
    	if (_gameType == "equ+-") {
    		return shuffle([
    			rightAns,
    			rightAns.plus(pm(10)),
    			rightAns.plus(pm(rand(1, 1))),
    			rightAns.plus(pm(rand(2, 2)))
    		]);
    	}

    	if (_gameType == "equ*/") {
    		return shuffle([
    			rightAns,
    			rightAns.plus(pm(rand(1, 1))),
    			rightAns.plus(pm(rand(2, 2))),
    			rightAns.plus(pm(rand(3, 3)))
    		]);
    	}

    	if (_gameType == "ab+c=d") {
    		return shuffle([
    			rightAns,
    			rightAns.plus(pm(rand(1, 1))),
    			rightAns.plus(pm(rand(2, 2))),
    			rightAns.plus(pm(rand(3, 3)))
    		]);
    	}

    	if (_gameType === "%-simple" || _gameType === "%-plus" || _gameType === "%-minus") {
    		return shuffle([rightAns, rightAns.plus(pm(5)), rightAns.plus(pm(10)), rightAns.plus(pm(15))]);
    	}

    	throw `Unknown game type '${_gameType}'`;
    }

    function makeEqu(pattern, abc) {
    	function isVar(ch) {
    		let code = ch.charCodeAt(0);
    		return code >= ("A").charCodeAt(0) && code <= ("Z").charCodeAt(0);
    	}

    	let chars = [...pattern];
    	let vars = chars.filter(isVar);
    	let v = randFrom(vars);
    	let equ = pattern.replace(v, "$").replace("xx", "@");
    	let ans = abc[v.charCodeAt(0) - ("A").charCodeAt(0)];

    	if (_gameType == "ab+c=d") {
    		let c = abc[2];

    		if (c.lt(0)) {
    			abc[2] = c.neg();
    			equ = equ.replace("+", "-");
    		}

    		if (ans.lt(0)) ans = ans.neg();
    	}

    	equ = equ.toLocaleLowerCase().replace("a", d2t(abc[0])).replace("b", d2t(abc[1])).replace("c", d2t(abc[2])).replace("d", d2t(abc[3])).replace("@", "xx").replace("$", randFrom(_x));
    	return [equ, ans];
    }

    class CGame {
    	constructor() {
    		for (let cmd of Anki.commands()) {
    			switch (cmd[0].toLocaleLowerCase()) {
    				case "equ+-":
    					_gameType = "equ+-";
    					break;
    				case "equ*/":
    					_gameType = "equ*/";
    					break;
    				case "ab+c=d":
    					_gameType = "ab+c=d";
    					break;
    				case "%-simple":
    					_gameType = "%-simple";
    					break;
    				case "%-plus":
    					_gameType = "%-plus";
    					break;
    				case "%-minus":
    					_gameType = "%-minus";
    					break;
    				case "no-overflow":
    					_noOverflow = true;
    					break;
    				case "x":
    					_x = cmd.slice(1);
    					break;
    				case "a":
    					_a = cmd.slice(1).map(x => parseInt(x));
    					break;
    				case "b":
    					_b = cmd.slice(1).map(x => parseInt(x));
    					break;
    				case "c":
    					_c = cmd.slice(1).map(x => parseInt(x));
    					break;
    				case "d":
    					_d = cmd.slice(1).map(x => parseInt(x));
    					break;
    				case "a[]":
    					_aA = cmd.slice(1).map(x => parseInt(x));
    					break;
    				case "b[]":
    					_bA = cmd.slice(1).map(x => parseInt(x));
    					break;
    				case "c[]":
    					_cA = cmd.slice(1).map(x => parseInt(x));
    					break;
    				case "d[]":
    					_dA = cmd.slice(1).map(x => parseInt(x));
    					break;
    			}
    		}

    		_patterns = Anki.tokens();
    		_next = -1;
    	}

    	get fsm() {
    		return _fsm;
    	}

    	isLast() {
    		return _next + 1 >= _totalRounds;
    	}

    	addRounds(count) {
    		_totalRounds += count;
    	}

    	nextRound() {
    		_next++;
    		let gameType = _gameType;
    		let pattern = _patterns[_next % _patterns.length];
    		let abc = newAbc();
    		abc.push(n2d(0)); // d
    		let [equ, rightAns] = makeEqu(pattern, abc);
    		let answers = makeAnswers(rightAns);
    		let progress = [_next < _totalRounds ? _next : _totalRounds, _totalRounds];

    		return {
    			gameType,
    			progress,
    			equ,
    			rightAns,
    			answers
    		};
    	}
    }

    const Game = new CGame();

    /* src\equation\Model.svelte generated by Svelte v3.38.3 */




    function on(name, cb) {
    	onAny(name, cb);
    }

    function newTimedCmd(cmd, timeout, jitter) {
    	return new CTimedCmd(cmd, timeout, jitter !== null && jitter !== void 0 ? jitter : 0);
    }

    /* src\equation\Ans.svelte generated by Svelte v3.38.3 */
    const file$1 = "src\\equation\\Ans.svelte";

    function create_fragment$2(ctx) {
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
    			add_location(button, file$1, 38, 0, 963);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(pulse.call(null, button)),
    					action_destroyer(bounceOnDrag.call(null, button)),
    					listen_dev(button, "click", /*click_handler*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*_text*/ 2) set_data_dev(t, /*_text*/ ctx[1]);

    			if (dirty & /*_bgColor*/ 8) {
    				attr_dev(button, "class", /*_bgColor*/ ctx[3]);
    			}

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

    function toText(v) {
    	return v.toNumber().toLocaleString("en");
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Ans", slots, []);
    	
    	let { ga } = $$props;
    	let { value } = $$props;
    	let { bgColor = getBgColor(ga, "bg-gray-100") } = $$props;
    	let { sz = 30 } = $$props;
    	let _text;
    	let _sz;
    	let _bgColor;

    	function setState(state) {
    		switch (state) {
    			case "start":
    				$$invalidate(1, _text = "??");
    				$$invalidate(3, _bgColor = bgColor);
    				break;
    			case "clicked":
    				$$invalidate(1, _text = toText(value));
    				$$invalidate(3, _bgColor = bgColor);
    				break;
    			case "right":
    				$$invalidate(1, _text = toText(value));
    				$$invalidate(3, _bgColor = "bg-green-200");
    				break;
    			case "wrong":
    				$$invalidate(1, _text = toText(value));
    				$$invalidate(3, _bgColor = "bg-red-200");
    				break;
    		}

    		$$invalidate(2, _sz = sz - 1.2 * _text.length);
    	}

    	const writable_props = ["ga", "value", "bgColor", "sz"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Ans> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("value" in $$props) $$invalidate(4, value = $$props.value);
    		if ("bgColor" in $$props) $$invalidate(5, bgColor = $$props.bgColor);
    		if ("sz" in $$props) $$invalidate(6, sz = $$props.sz);
    	};

    	$$self.$capture_state = () => ({
    		pulse,
    		getBgColor,
    		bounceOnDrag,
    		ga,
    		value,
    		bgColor,
    		sz,
    		_text,
    		_sz,
    		_bgColor,
    		toText,
    		setState
    	});

    	$$self.$inject_state = $$props => {
    		if ("ga" in $$props) $$invalidate(0, ga = $$props.ga);
    		if ("value" in $$props) $$invalidate(4, value = $$props.value);
    		if ("bgColor" in $$props) $$invalidate(5, bgColor = $$props.bgColor);
    		if ("sz" in $$props) $$invalidate(6, sz = $$props.sz);
    		if ("_text" in $$props) $$invalidate(1, _text = $$props._text);
    		if ("_sz" in $$props) $$invalidate(2, _sz = $$props._sz);
    		if ("_bgColor" in $$props) $$invalidate(3, _bgColor = $$props._bgColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ga, _text, _sz, _bgColor, value, bgColor, sz, setState, click_handler];
    }

    class Ans extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			ga: 0,
    			value: 4,
    			bgColor: 5,
    			sz: 6,
    			setState: 7
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ans",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ga*/ ctx[0] === undefined && !("ga" in props)) {
    			console.warn("<Ans> was created without expected prop 'ga'");
    		}

    		if (/*value*/ ctx[4] === undefined && !("value" in props)) {
    			console.warn("<Ans> was created without expected prop 'value'");
    		}
    	}

    	get ga() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ga(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bgColor() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bgColor(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sz() {
    		throw new Error("<Ans>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sz(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setState() {
    		return this.$$.ctx[7];
    	}

    	set setState(value) {
    		throw new Error("<Ans>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\equation\Main.svelte generated by Svelte v3.38.3 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	child_ctx[22] = list;
    	child_ctx[23] = i;
    	return child_ctx;
    }

    // (129:4) {#each _round.answers as ans, no}
    function create_each_block(ctx) {
    	let ans;
    	let no = /*no*/ ctx[23];
    	let current;
    	const assign_ans = () => /*ans_binding*/ ctx[9](ans, no);
    	const unassign_ans = () => /*ans_binding*/ ctx[9](null, no);

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[10](/*ans*/ ctx[21]);
    	}

    	let ans_props = {
    		ga: `a${/*no*/ ctx[23]}`,
    		value: /*ans*/ ctx[21]
    	};

    	ans = new Ans({ props: ans_props, $$inline: true });
    	assign_ans();
    	ans.$on("click", click_handler_1);

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

    			if (no !== /*no*/ ctx[23]) {
    				unassign_ans();
    				no = /*no*/ ctx[23];
    				assign_ans();
    			}

    			const ans_changes = {};
    			if (dirty & /*_round*/ 2) ans_changes.value = /*ans*/ ctx[21];
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
    		source: "(129:4) {#each _round.answers as ans, no}",
    		ctx
    	});

    	return block;
    }

    // (114:0) <Grid {layout}      on:click={() => anyClick()}  >
    function create_default_slot$1(ctx) {
    	let progress;
    	let t0;
    	let clock;
    	let t1;
    	let asciimath;
    	let t2;
    	let t3;
    	let congrats_1;
    	let current;

    	progress = new Progress({
    			props: { ga: "prg", values: /*_progress*/ ctx[3] },
    			$$inline: true
    		});

    	clock = new Clock({ props: { ga: "clk" }, $$inline: true });

    	asciimath = new AsciiMath({
    			props: {
    				ga: "equ",
    				sz: 40,
    				exp: /*_round*/ ctx[1].equ,
    				scale: getScale(/*_round*/ ctx[1].gameType)
    			},
    			$$inline: true
    		});

    	asciimath.$on("click", /*click_handler*/ ctx[8]);
    	let each_value = /*_round*/ ctx[1].answers;
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
    	/*congrats_1_binding*/ ctx[11](congrats_1);

    	const block = {
    		c: function create() {
    			create_component(progress.$$.fragment);
    			t0 = space();
    			create_component(clock.$$.fragment);
    			t1 = space();
    			create_component(asciimath.$$.fragment);
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			create_component(congrats_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(progress, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(clock, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(asciimath, target, anchor);
    			insert_dev(target, t2, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t3, anchor);
    			mount_component(congrats_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const progress_changes = {};
    			if (dirty & /*_progress*/ 8) progress_changes.values = /*_progress*/ ctx[3];
    			progress.$set(progress_changes);
    			const asciimath_changes = {};
    			if (dirty & /*_round*/ 2) asciimath_changes.exp = /*_round*/ ctx[1].equ;
    			if (dirty & /*_round*/ 2) asciimath_changes.scale = getScale(/*_round*/ ctx[1].gameType);
    			asciimath.$set(asciimath_changes);

    			if (dirty & /*_round, _answers, gotAnswer*/ 70) {
    				each_value = /*_round*/ ctx[1].answers;
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
    						each_blocks[i].m(t3.parentNode, t3);
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
    			transition_in(progress.$$.fragment, local);
    			transition_in(clock.$$.fragment, local);
    			transition_in(asciimath.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(congrats_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(progress.$$.fragment, local);
    			transition_out(clock.$$.fragment, local);
    			transition_out(asciimath.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(congrats_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(progress, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(clock, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(asciimath, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t3);
    			/*congrats_1_binding*/ ctx[11](null);
    			destroy_component(congrats_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(114:0) <Grid {layout}      on:click={() => anyClick()}  >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let grid;
    	let current;

    	grid = new Grid({
    			props: {
    				layout: /*layout*/ ctx[7],
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	grid.$on("click", /*click_handler_2*/ ctx[12]);

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

    			if (dirty & /*$$scope, congrats, _round, _answers, _progress*/ 16777231) {
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

    function getScale(gameType) {
    	switch (gameType) {
    		case "%-simple":
    		case "%-plus":
    		case "%-minus":
    			return 1.2;
    	}

    	return undefined;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Main", slots, []);
    	
    	
    	let congrats;
    	let _game = Game;
    	let _round = _game.nextRound();
    	let _answers = [null, null, null, null];
    	let _state;
    	let _progress = [1, 10];
    	let _tcNewRound = newTimedCmd("--cmd-new-round", 1000);
    	let _tcIdle = newTimedCmd("--cmd-idle", 10000, 3000);

    	function equClick() {
    		Mp3.playRandom();
    	}

    	function anyClick() {
    		_tcIdle.reset();

    		if (_state == "start") {
    			_state = "clicked";
    			_answers.forEach(ans => ans.setState("clicked"));
    			return true;
    		}

    		if (_state === "clicked") return false;

    		if (_state == "answered") {
    			newRound();
    			return true;
    		}

    		return true;
    	}

    	function addRounds(count) {
    		_game.addRounds(count);
    		$$invalidate(3, _progress[0] += 1, _progress);
    		$$invalidate(3, _progress[1] += count, _progress);
    	}

    	function gotAnswer(value) {
    		_tcIdle.reset();
    		if (anyClick()) return;

    		if (_state === "clicked") {
    			_state = "answered";
    			let answerAt = _round.answers.findIndex(x => x === value);
    			let rightAt = _round.answers.findIndex(x => x === _round.rightAns);

    			if (answerAt === rightAt) {
    				$$invalidate(3, _progress[0] += 1, _progress);
    				let isLast = _game.isLast(_round);
    				Mp3.play(isLast ? "done" : "yes");
    				_tcNewRound.reset();
    				if (isLast) congrats.play();
    			} else {
    				_answers[answerAt].setState("wrong");
    				Mp3.play("no");
    				addRounds(2);
    			}

    			_answers[rightAt].setState("right");
    		}
    	}

    	function newRound() {
    		$$invalidate(1, _round = _game.nextRound());
    		startRound();
    	}

    	function idle() {
    		Mp3.play("idle");
    		_tcIdle.reset();
    	}

    	function startRound() {
    		_state = "start";
    		_tcIdle.reset();
    		_tcNewRound.cancel();

    		_answers.forEach(ans => {
    			ans.setState("start");
    		});

    		$$invalidate(3, _progress = _round.progress);
    	}

    	onMount(() => startRound());

    	let layout = {
    		areas: `
            "prg   .    clk "
            "equ   equ  equ"
            "a0    .    a1  "
            "a2    .    a3  "
        `,
    		cols: `2fr 1fr 2fr`,
    		rows: `60px 80px 80px 80px`,
    		bgColors: { prg: "bg-green-300", equ: "bg-yellow-50" }
    	};

    	on("--cmd-new-round", () => newRound());
    	on("--cmd-idle", () => idle());
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Main> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => equClick();

    	function ans_binding($$value, no) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			_answers[no] = $$value;
    			$$invalidate(2, _answers);
    		});
    	}

    	const click_handler_1 = ans => gotAnswer(ans);

    	function congrats_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			congrats = $$value;
    			$$invalidate(0, congrats);
    		});
    	}

    	const click_handler_2 = () => anyClick();

    	$$self.$capture_state = () => ({
    		onMount,
    		Mp3,
    		AsciiMath,
    		Clock,
    		Grid,
    		Progress,
    		Congrats,
    		Game,
    		newTimedCmd,
    		on,
    		Ans,
    		congrats,
    		_game,
    		_round,
    		_answers,
    		_state,
    		_progress,
    		_tcNewRound,
    		_tcIdle,
    		equClick,
    		anyClick,
    		addRounds,
    		gotAnswer,
    		newRound,
    		idle,
    		startRound,
    		getScale,
    		layout
    	});

    	$$self.$inject_state = $$props => {
    		if ("congrats" in $$props) $$invalidate(0, congrats = $$props.congrats);
    		if ("_game" in $$props) _game = $$props._game;
    		if ("_round" in $$props) $$invalidate(1, _round = $$props._round);
    		if ("_answers" in $$props) $$invalidate(2, _answers = $$props._answers);
    		if ("_state" in $$props) _state = $$props._state;
    		if ("_progress" in $$props) $$invalidate(3, _progress = $$props._progress);
    		if ("_tcNewRound" in $$props) _tcNewRound = $$props._tcNewRound;
    		if ("_tcIdle" in $$props) _tcIdle = $$props._tcIdle;
    		if ("layout" in $$props) $$invalidate(7, layout = $$props.layout);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		congrats,
    		_round,
    		_answers,
    		_progress,
    		equClick,
    		anyClick,
    		gotAnswer,
    		layout,
    		click_handler,
    		ans_binding,
    		click_handler_1,
    		congrats_1_binding,
    		click_handler_2
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

    // (52:0) <Grid {layout}>
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
    			props: { ga: "ver", v: "0.7.0" },
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
    			add_location(div, file, 52, 4, 1530);
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
    		source: "(52:0) <Grid {layout}>",
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
    		initMath();
    	});

    	function loadGame() {
    		try {
    			let config = Anki.getConfig();
    			Mp3.buildMp3Library("assets", config.soundOn);

    			switch (config.game) {
    				case "plus-over":
    				case "mul-div":
    					return Main$3;
    				case "gcd-lcm":
    					return Main$2;
    				case "zero":
    					return Main$1;
    				case "equ-abc":
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
    		initMath,
    		Mp3,
    		PlusOver: Main$3,
    		GcdLcm: Main$2,
    		Zero: Main$1,
    		Equ: Main,
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
